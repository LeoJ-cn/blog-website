#!/usr/bin/env bash
set -euo pipefail

# 从 .figma/source.yaml 统一读取配置，不在脚本中保存 Token。
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/.figma/source.yaml"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_tools() {
  local tool
  for tool in yq jq curl; do
    command -v "$tool" >/dev/null 2>&1 || fail "缺少工具：$tool"
  done
}

load_config() {
  [[ -f "$CONFIG" ]] || fail "配置文件不存在：$CONFIG"
  FILE_KEY="$(yq -r '.figma.file_key // ""' "$CONFIG")"
  NODE_ID="$(yq -r '.figma.node_id // ""' "$CONFIG")"
  MCP_NAME="$(yq -r '.auth.mcp // ""' "$CONFIG")"
  TOKEN_ENV="$(yq -r '.auth.token_env // ""' "$CONFIG")"
  OUTPUT_DIR="$(yq -r '.output.directory // ".figma"' "$CONFIG")"

  [[ "$FILE_KEY" =~ ^[a-zA-Z0-9]+$ ]] || fail 'file_key 无效'
  [[ "$NODE_ID" =~ ^[0-9]+:[0-9]+$ ]] || fail 'node_id 无效'
  [[ -n "$MCP_NAME" ]] || fail '缺少 auth.mcp'
  [[ "$TOKEN_ENV" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || fail 'token_env 无效'
  [[ "$OUTPUT_DIR" == '.figma' ]] || fail '当前版本要求 output.directory 为 .figma'
  RAW_DIR="$ROOT/.figma/raw"
}

load_token() {
  TOKEN="${!TOKEN_ENV:-}"
  if [[ -z "$TOKEN" ]] && command -v security >/dev/null 2>&1; then
    TOKEN="$(security find-generic-password -a "$USER" -s "$TOKEN_ENV" -w 2>/dev/null)" || true
  fi
  [[ -n "$TOKEN" ]] || fail "找不到 $TOKEN_ENV：请先设置环境变量或写入 Keychain"
}

check() {
  printf '配置文件: %s\n' "$CONFIG"
  printf 'File Key: %s\nNode ID: %s\nMCP: %s\nToken变量名: %s\n' "$FILE_KEY" "$NODE_ID" "$MCP_NAME" "$TOKEN_ENV"
  printf 'Token: 已找到（不显示实际值）\n'
}

# curl 下载到临时文件 -> 校验 -> 格式化 -> 原子替换，避免失败时破坏旧缓存。
format_json() {
  local input="$1" output="$2" formatted
  formatted="$(mktemp "${output}.format.XXXXXX")"
  if ! jq --indent 2 . "$input" >"$formatted"; then
    rm -f "$formatted"
    fail "JSON 格式错误：$input"
  fi
  mv -f "$formatted" "$output"
}

fetch_json() {
  local output="$1" endpoint="$2"
  shift 2
  mkdir -p "$RAW_DIR"
  local tmp
  tmp="$(mktemp "${output}.download.XXXXXX")"
  if ! curl --fail-with-body -sS --retry 2 \
    -H "X-Figma-Token: $TOKEN" -G "$@" "$endpoint" -o "$tmp"; then
    rm -f "$tmp"
    fail "请求失败：$endpoint"
  fi
  # 校验 API 响应是 JSON；实际业务数据由各命令继续校验。
  if ! jq -e 'type == "object"' "$tmp" >/dev/null; then
    rm -f "$tmp"
    fail "REST 未返回有效 JSON：$endpoint"
  fi
  format_json "$tmp" "$output"
  rm -f "$tmp"
}

fetch_index() {
  local output="$RAW_DIR/index.json"
  fetch_json "$output" "https://api.figma.com/v1/files/$FILE_KEY" --data-urlencode 'depth=2'
  jq -e '.document.children | type == "array"' "$output" >/dev/null || fail 'index 返回数据不符合预期'
  printf '已生成 %s\n' "$output"
  jq -r '"文件：\(.name)；版本：\(.version)；Pages：\(.document.children|length)"' "$output"
}

# 若 index.json 的 fileKey 不可验证，版本只作为可选参数；保持与当前流程一致。
version_args=()
set_version_args() {
  version_args=()
  if [[ -f "$RAW_DIR/index.json" ]]; then
    local version
    version="$(jq -r '.version // empty' "$RAW_DIR/index.json")"
    [[ -z "$version" ]] || version_args=(--data-urlencode "version=$version")
  fi
}

fetch_target() {
  local output="$RAW_DIR/target.json"
  set_version_args
  fetch_json "$output" "https://api.figma.com/v1/files/$FILE_KEY/nodes" \
    --data-urlencode "ids=$NODE_ID" "${version_args[@]}"
  jq -e --arg id "$NODE_ID" '.nodes[$id].document != null' "$output" >/dev/null || fail "未找到目标节点：$NODE_ID"
  printf '已生成 %s\n' "$output"
  jq -r --arg id "$NODE_ID" '.nodes[$id].document | "节点：\(.name)；类型：\(.type)；子节点：\((.children // [])|length)"' "$output"
}

fetch_interactions() {
  local output="$ROOT/.figma/interactions.yaml"
  [[ -f "$RAW_DIR/target.json" ]] || fail '缺少 target.json，请先执行 target'
  # 汇总目标 Frame + 已经下载的其他 Screens 和组件状态；依据节点 ID 去除重复动作。
  local inputs=("$RAW_DIR/target.json")
  [[ ! -f "$RAW_DIR/screens.json" ]] || inputs+=("$RAW_DIR/screens.json")
  [[ ! -f "$RAW_DIR/related.json" ]] || inputs+=("$RAW_DIR/related.json")
  local tmp
  tmp="$(mktemp "${output}.XXXXXX")"
  if ! jq -s '
    [ .[] | .nodes // {} | to_entries[] | .value.document // empty
      | .. | objects | select(has("id") and has("type") and (.interactions? | type == "array"))
      | . as $node | .interactions[] | . as $interaction
      | ($interaction.actions // [])[]
      | {source_node:$node.id,source_name:$node.name,trigger:$interaction.trigger.type,
         action:.type,navigation:(.navigation // null),target_node:(.destinationId // null),
         transition:(.transition // null),evidence:"figma-rest"}
    ] | unique_by([.source_node,.trigger,.action,.navigation,.target_node,.transition])
  ' "${inputs[@]}" | yq -P -p=json >"$tmp"; then
    rm -f "$tmp"
    fail '交互提取失败'
  fi
  mv -f "$tmp" "$output"
  printf '已生成 %s；交互动作数：%s\n' "$output" "$(yq '. | length' "$output")"
}

fetch_related() {
  local input="$ROOT/.figma/interactions.yaml" output="$RAW_DIR/related.json"
  [[ -f "$input" ]] || fail '缺少 interactions.yaml，请先执行 interactions'
  local ids
  ids="$(yq -r '[.[] | select(.target_node != null and .navigation == "CHANGE_TO") | .target_node] | unique | join(",")' "$input")"
  [[ -n "$ids" ]] || {
    echo '没有可获取的 CHANGE_TO 关联目标'
    return 0
  }
  set_version_args
  fetch_json "$output" "https://api.figma.com/v1/files/$FILE_KEY/nodes" \
    --data-urlencode "ids=$ids" "${version_args[@]}"
  jq -e '.nodes | type == "object"' "$output" >/dev/null || fail 'related 数据不符合预期'
  jq -r '.nodes | to_entries[] | [.key,(.value.document.name // "未找到")] | @tsv' "$output"
  echo "已生成 $output"
}

fetch_screens() {
  local index="$RAW_DIR/index.json" output="$RAW_DIR/screens.json"
  [[ -f "$index" ]] || fail '缺少 index.json，请先执行 index'
  local ids expected
  ids="$(jq -r --arg id "$NODE_ID" '[.document.children[] | select(any(.children[]?; .id == $id)) | .children[] | select(.type == "FRAME" and .id != $id) | .id] | unique | join(",")' "$index")"
  [[ -n "$ids" ]] || {
    echo '没有其他同页 Frame'
    return 0
  }
  expected="$(tr ',' '\n' <<<"$ids" | wc -l | tr -d ' ')"
  set_version_args
  fetch_json "$output" "https://api.figma.com/v1/files/$FILE_KEY/nodes" \
    --data-urlencode "ids=$ids" "${version_args[@]}"
  jq -e --argjson count "$expected" '(.nodes | length) == $count and all(.nodes[]; .document != null)' "$output" >/dev/null || fail 'screens 缺少部分节点'
  echo "已生成 $output；Frames：$expected"
}

usage() {
  printf '用法：bash .figma/fetch.sh {check|index|target|screens|interactions|related}\n' >&2
  exit 2
}

[[ $# -eq 1 ]] || usage
require_tools
load_config
case "$1" in
check)
  load_token
  check
  ;;
index)
  load_token
  fetch_index
  ;;
target)
  load_token
  fetch_target
  ;;
screens)
  load_token
  fetch_screens
  ;;
interactions) fetch_interactions ;;
related)
  load_token
  fetch_related
  ;;
*) usage ;;
esac
