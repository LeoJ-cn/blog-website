import {
  DEFAULT_KEYWORD_FIELDS,
  DEFAULT_ASSIGNEE_FIELDS,
  DEFAULT_CLASSIFICATION_NUMBER_FIELDS,
  DEFAULT_OTHER_FIELDS,
  LOGIC_OPERATOR_AND,
  LOGIC_OPERATOR_OR,
  LOGIC_OPERATOR_NOT,
} from '../../constants'
import get from 'lodash/get'

let SEARCH_FIELDS = [
  {
    name: 'ALL_AN',
    value: 'ALL_AN:()',
    labelPlaceholder: '',
    desc: {
      en: 'All Assignees',
      cn: '[全字段]申请(专利权)人',
      tw: '[全字段]申請(專利權)人',
      jp: '[フルフィールド]出願（特許）人',
      de: 'Anmeldung (Patent) gemeinsamer Index',
    },
  },
  {
    name: 'ANCS',
    value: 'ANCS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Std. Current Assignee',
      cn: '[标]当前申请(专利权)人',
      tw: '[標]當前申請(專利權)人',
      jp: '[標準]譲受人',
      de: 'Standardisierter gegenwärtiger Beauftragter',
    },
  },
  {
    name: 'ANC',
    value: 'ANC:()',
    labelPlaceholder: '',
    desc: {
      en: 'Current Assignee',
      cn: '当前申请(专利权)人',
      tw: '當前申請(專利權)人',
      jp: '譲受人',
      de: 'Aktueller Beauftragter',
    },
  },
  {
    name: 'DOCDB_AN',
    value: 'DOCDB_AN:()',
    labelPlaceholder: '',
    desc: {
      en: 'Docdb Assignee',
      cn: 'Docdb申请(专利权)人',
      tw: 'Docdb申請(專利權)人',
      jp: 'Docdb譲受人',
      de: 'Docdb-Beauftragter',
    },
  },
  {
    name: 'ANS',
    value: 'ANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Std. Original Assignee (Applicant)',
      cn: '[标]原始申请(专利权)人',
      tw: '[標]原始申請(專利權)人',
      jp: '[標準]出願人',
      de: 'Standardisierter ursprünglicher Rechtsnachfolger (Antragsteller)',
    },
  },
  {
    name: 'AN',
    value: 'AN:()',
    labelPlaceholder: '',
    desc: {
      en: 'Original Assignee (Applicant)',
      cn: '原始申请(专利权)人',
      tw: '原始申請(專利權)人',
      jp: '出願人',
      de: 'ursprünglicher Rechtsnachfolger (Anmelder)',
    },
  },
  {
    name: 'TAC',
    value: 'TAC:()',
    labelPlaceholder: '',
    desc: {
      en: 'Title/Abstract/Claims',
      cn: '标题/摘要/权利要求',
      tw: '標題/摘要/權利要求',
      jp: '特許名称/要約/請求項',
      de: 'Titel/Abstract/Ansprüche',
    },
  },
  {
    name: 'PN',
    value: 'PN:()',
    labelPlaceholder: '',
    desc: {
      en: 'Publication Number',
      cn: '公开(公告)号',
      tw: '公開(公告)號',
      jp: '公開(公告)番号',
      de: 'Publikationsnummer',
    },
  },
  {
    name: 'IPC',
    value: 'IPC:()',
    labelPlaceholder: '',
    desc: {
      en: 'IPC',
      cn: 'IPC分类号',
      tw: 'IPC分類號',
      jp: '国際特許分類',
      de: 'Internationale Patent Klassifikation',
    },
  },
  {
    name: 'TA',
    value: 'TA:()',
    labelPlaceholder: '',
    desc: {
      en: 'Title/Abstract',
      cn: '标题/摘要',
      tw: '標題/摘要',
      jp: '特許名称/要約',
      de: 'Titel/Abstract',
    },
  },
  {
    name: 'DESC',
    value: 'DESC:()',
    labelPlaceholder: '',
    desc: {
      en: 'Description',
      cn: '说明书',
      tw: '說明書',
      jp: '明細書',
      de: 'Beschreibung',
    },
  },
  {
    name: 'TTL',
    value: 'TTL:()',
    labelPlaceholder: '',
    desc: {
      en: 'Title',
      cn: '标题',
      tw: '標題',
      jp: '特許名称',
      de: 'Titel',
    },
  },
  {
    name: 'PBD',
    value: 'PBD:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Publication Date',
      cn: '公开日',
      tw: '公開日',
      jp: '公開日',
      de: 'Veröffentlichungsdatum',
    },
  },
  {
    name: 'ABST',
    value: 'ABST:()',
    labelPlaceholder: '',
    desc: {
      en: 'Abstract',
      cn: '摘要',
      tw: '摘要',
      jp: '要約',
      de: 'Abstract',
    },
  },
  {
    name: 'MIPC',
    value: 'MIPC:()',
    labelPlaceholder: '',
    desc: {
      en: 'Main IPC',
      cn: 'IPC主分类号',
      tw: 'IPC主分類號',
      jp: '国際特許主分類',
      de: 'Haupt IPC',
    },
  },
  {
    name: 'CLMS',
    value: 'CLMS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Claims',
      cn: '权利要求',
      tw: '權利要求',
      jp: '請求項',
      de: 'Ansprüche',
    },
  },
  {
    name: 'IN',
    value: 'IN:()',
    labelPlaceholder: '',
    desc: {
      en: 'Inventor Name',
      cn: '发明人',
      tw: '發明人',
      jp: '発明者',
      de: 'Erfinder',
    },
  },
  {
    name: 'APD',
    value: 'APD:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Application Date',
      cn: '申请日',
      tw: '申請日',
      jp: '出願日',
      de: 'Bewerbungsdatum',
    },
  },
  {
    name: 'PE',
    value: 'PE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Primary Examiner',
      cn: '审查员',
      tw: '審查員',
      jp: '審査官',
      de: 'Überprüfer',
    },
  },
  {
    name: 'ATC',
    value: 'ATC:()',
    labelPlaceholder: '',
    desc: {
      en: 'Agency',
      cn: '代理机构',
      tw: '代理機構',
      jp: '特許事務所',
      de: 'Agentur',
    },
  },
  {
    name: 'CPC',
    value: 'CPC:()',
    labelPlaceholder: '',
    desc: {
      en: 'CPC',
      cn: 'CPC分类号',
      tw: 'CPC分類號',
      jp: '共通特許分類',
      de: 'Kooperative Patent Klassifikation',
    },
  },
  {
    name: 'LOC',
    value: 'LOC:()',
    labelPlaceholder: '',
    desc: {
      en: 'LOC',
      cn: 'LOC分类号',
      tw: 'LOC分類號',
      jp: '国際意匠分類',
      de: 'Locarno Design Klassifizierung',
    },
  },
  {
    name: 'GBC',
    value: 'GBC:()',
    labelPlaceholder: '',
    desc: {
      en: 'Industrial classification for national economic activities',
      cn: '国民经济行业分类号',
      tw: '國民經濟行業分類號',
      jp: '中国国家経済産業分類番号',
      de: 'Industrielle Einstufung für nationale Wirtschaftstätigkeiten',
    },
  },
  {
    name: 'AT',
    value: 'AT:()',
    labelPlaceholder: '',
    desc: {
      en: 'Attorney',
      cn: '代理人',
      tw: '代理人',
      jp: '代理人',
      de: 'Agent',
    },
  },
  {
    name: 'ICLMS',
    value: 'ICLMS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Independent Claims',
      cn: '独立权利要求',
      tw: '獨立權利要求',
      jp: '独立請求項',
      de: 'Unabhängige Ansprüche',
    },
  },
  {
    name: 'PRIORITY_DATE',
    value: 'PRIORITY_DATE:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Priority Date',
      cn: '优先权日',
      tw: '優先權日',
      jp: '優先権日',
      de: 'Prioritätsdatum',
    },
  },
  {
    name: 'UPC',
    value: 'UPC:()',
    labelPlaceholder: '',
    desc: {
      en: 'UPC',
      cn: 'UPC分类号',
      tw: 'UPC分類號',
      jp: '米国特許分類',
      de: 'US-Patent Klassifikation',
    },
  },
  {
    name: 'PATENT_TYPE',
    value: 'PATENT_TYPE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Patent Type',
      cn: '专利类型',
      tw: '專利類型',
      jp: '特許タイプ',
      de: 'Patenttyp',
    },
  },
  {
    name: 'FI',
    value: 'FI:()',
    labelPlaceholder: '',
    desc: {
      en: 'Japan File Index Classification',
      cn: 'FI分类号',
      tw: 'FI分類號',
      jp: 'FI',
      de: 'Japan File Index Klassifikation',
    },
  },
  {
    name: 'FTERM',
    value: 'FTERM:()',
    labelPlaceholder: '',
    desc: {
      en: 'Japan F-term Classification',
      cn: 'F-TERM分类号',
      tw: 'F-TERM分類號',
      jp: 'F-TERM分類番号',
      de: 'F-TERM Klassifikation',
    },
  },
  {
    name: 'AE',
    value: 'AE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Assistant Examiner',
      cn: '助理审查员',
      tw: '助理審查員',
      jp: '審査官補',
      de: 'Assistenzprüfer',
    },
  },
  {
    name: 'APNO',
    value: 'APNO:()',
    labelPlaceholder: '',
    desc: {
      en: 'Application Number',
      cn: '申请号',
      tw: '申請號',
      jp: '出願番号',
      de: 'Anmeldenummer',
    },
  },
  {
    name: 'AUTHORITY',
    value: 'AUTHORITY:()',
    labelPlaceholder: '',
    desc: {
      en: 'Authority / Jurisdiction / Country',
      cn: '受理局',
      tw: '受理局',
      jp: '受理官庁',
      de: 'Behörde / Gerichtsbarkeit / Land',
    },
  },
  {
    name: 'ANC_COUNTRY',
    value: 'ANC_COUNTRY:()',
    labelPlaceholder: '',
    desc: {
      en: 'Current Assignee Region',
      cn: '当前申请(专利权)人区域',
      tw: '當前申請(專利權)人區域',
      jp: '譲受人のエリア',
      de: 'Current Assignee Region',
    },
  },
  {
    name: 'ANC_PROVINCE',
    value: 'ANC_PROVINCE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Current Assignee State/Province',
      cn: '当前申请(专利权)人州/省',
      tw: '當前申請(專利權)人州/省',
      jp: '譲受人の州',
      de: 'Current-Assignee-Provinz',
    },
  },
  {
    name: 'F_ANC',
    value: 'F_ANC:()',
    labelPlaceholder: '',
    desc: {
      en: 'First Current Assignee',
      cn: '第一当前申请(专利权)人',
      tw: '第壹當前申請(專利權)人',
      jp: '第一最新の出願人(特許権者)',
      de: 'Erster gegenwärtiger Beauftragter',
    },
  },
  {
    name: 'ANC_ADD',
    value: 'ANC_ADD:()',
    labelPlaceholder: '',
    desc: {
      en: 'Current Assignee Address',
      cn: '当前申请(专利权)人地址',
      tw: '當前申請(專利權)人地址',
      jp: '譲受人の住所',
      de: 'Aktuelle Empfängeradresse',
    },
  },
  {
    name: 'IN_ADDRESS',
    value: 'IN_ADDRESS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Inventor Address',
      cn: '发明人地址',
      tw: '發明人地址',
      jp: '発明者住所',
      de: 'Erfinder Adresse',
    },
  },
  {
    name: 'KD',
    value: 'KD:()',
    labelPlaceholder: '',
    desc: {
      en: 'Kind Code',
      cn: '文献代码',
      tw: '文獻代碼',
      jp: '文献コード',
      de: 'Dokument Code',
    },
  },
  {
    name: 'F_IN',
    value: 'F_IN:()',
    labelPlaceholder: '',
    desc: {
      en: 'First Inventor',
      cn: '第一发明人',
      tw: '第壹發明人',
      jp: '第一発明者',
      de: 'Erster Erfinder',
    },
  },
  {
    name: 'PRNO',
    value: 'PRNO:()',
    labelPlaceholder: '',
    desc: {
      en: 'Priority Number',
      cn: '优先权号',
      tw: '優先權號',
      jp: '優先権番号',
      de: 'Prioritätsnummer',
    },
  },
  {
    name: 'TTL_ENTRANS',
    value: 'TTL_ENTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'English Translated Title',
      cn: '英文机翻标题',
      tw: '英文機翻標題',
      jp: '英訳版特許名称',
      de: 'Englischer übersetzter Titel',
    },
  },
  {
    name: 'ABST_ENTRANS',
    value: 'ABST_ENTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'English Translated Abstract',
      cn: '英文机翻摘要',
      tw: '英文機翻摘要',
      jp: '英訳版要旨',
      de: 'Englisch übersetzte Zusammenfassung',
    },
  },
  {
    name: 'CLMS_ENTRANS',
    value: 'CLMS_ENTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'English Translated Claims',
      cn: '英文机翻权利要求',
      tw: '英文機翻權利要求',
      jp: '英語翻訳済み請求',
      de: 'Englisch übersetzte Ansprüche',
    },
  },
  {
    name: 'TTL_CNTRANS',
    value: 'TTL_CNTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Chinese Translated Title',
      cn: '中文机翻标题',
      tw: '中文機翻標題',
      jp: '中国語訳版タイトル',
      de: 'Chinesischer übersetzter Titel',
    },
  },
  {
    name: 'ABST_CNTRANS',
    value: 'ABST_CNTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Chinese Translated Abstract',
      cn: '中文机翻摘要',
      tw: '中文機翻摘要',
      jp: '中国語訳版要旨',
      de: 'Chinesisch übersetzte Zusammenfassung',
    },
  },
  {
    name: 'CLMS_CNTRANS',
    value: 'CLMS_CNTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Chinese Translated Claims',
      cn: '中文机翻权利要求',
      tw: '中文機翻權利要求',
      jp: '中国語翻訳クレーム',
      de: 'Chinesisch übersetzte Ansprüche',
    },
  },
  {
    name: 'AN_ENTRANS',
    value: 'AN_ENTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'English Translated Assignee',
      cn: '英文机翻申请人',
      tw: '英文機翻申請人',
      jp: '英訳版出願人/権利者',
      de: 'Englisch übersetzter Rechtsnachfolger',
    },
  },
  {
    name: 'AN_CNTRANS',
    value: 'AN_CNTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Chinese Translated Assignee',
      cn: '中文机翻申请人',
      tw: '中文機翻申請人',
      jp: '中国語訳版出願人/権利者',
      de: 'Chinesischer übersetzter Abtretungsempfänger',
    },
  },
  {
    name: 'LEGAL_STATUS',
    value: 'LEGAL_STATUS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Legal Status',
      cn: '法律状态',
      tw: '法律狀態',
      jp: '法的ステータス',
      de: 'Rechtlicher Status',
    },
  },
  {
    name: 'ISD',
    value: 'ISD:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Issue Date',
      cn: '授权日',
      tw: '授權日',
      jp: '授権日',
      de: 'Autorisierungstag',
    },
  },
  {
    name: 'EXDT',
    value: 'EXDT:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Expiry Date',
      cn: '到期日',
      tw: '到期日',
      jp: '期間満了日',
      de: 'Fälligkeitsdatum',
    },
  },
  {
    name: 'PCTENTRY_DATE',
    value: 'PCTENTRY_DATE:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'PCT Entry Date',
      cn: 'PCT进入国家阶段日',
      tw: 'PCT進入國家階段日',
      jp: 'PCT優先権日',
      de: 'PCT Nationale Phase eingebendes Datum',
    },
  },
  {
    name: 'VERDICT_DATE',
    value: 'VERDICT_DATE:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Verdict Date',
      cn: '判决时间',
      tw: '判決時間',
      jp: '判決日',
      de: 'Urteil Zeit',
    },
  },
  {
    name: 'HEARING_DATE',
    value: 'HEARING_DATE:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Hearing Date',
      cn: '听证日',
      tw: '聽證日',
      jp: '公聴日',
      de: 'Anhörung Datum',
    },
  },
  {
    name: 'LIT_CLOSEDT',
    value: 'LIT_CLOSEDT:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Date of Closed',
      cn: '案件结束日',
      tw: '案件結束日',
      jp: '案件決着日',
      de: 'Ende des Falles',
    },
  },
  {
    name: 'LIC_EFDT',
    value: 'LIC_EFDT:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Effective Date',
      cn: '许可生效日',
      tw: '許可生效日',
      jp: 'ライセンス発効日',
      de: 'Genehmigung gültiges Datum',
    },
  },
  {
    name: 'RIDDT',
    value: 'RIDDT:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Decision Date',
      cn: '决定日',
      tw: '決定日',
      jp: '決定日',
      de: 'Entscheidung Datum',
    },
  },
  {
    name: 'PLE_EFDT',
    value: 'PLE_EFDT:[ TO 2019]',
    labelPlaceholder: '1893 TO 2019',
    desc: {
      en: 'Pledge Effect Date',
      cn: '质押生效日',
      tw: '質押生效日',
      jp: '質権発効日',
      de: 'Versprechen Datum',
    },
  },
  {
    name: 'CLAIM_COUNT',
    value: 'CLAIM_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Claim Count',
      cn: '权利要求数',
      tw: '權利要求數',
      jp: '請求項の数',
      de: 'Anzahl der Ansprüche',
    },
  },
  {
    name: 'PV',
    value: 'PV:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Patent Value(USD)',
      cn: '专利价值（美元）',
      tw: '專利價值（美元）',
      jp: '特許価値（ドル）',
      de: 'Patent Wert(USD)',
    },
  },
  {
    name: 'GOV',
    value: 'GOV:()',
    labelPlaceholder: '',
    desc: {
      en: 'Government Interest',
      cn: '政府利益',
      tw: '政府利益',
      jp: '政府利益',
      de: 'Regierungsinteressen',
    },
  },
  {
    name: 'CITEDBY',
    value: 'CITEDBY:()',
    labelPlaceholder: '',
    desc: {
      en: 'Cited By Patent',
      cn: '被引用专利',
      tw: '被引用專利',
      jp: '被引用特許',
      de: 'Zitierte Patente',
    },
  },
  {
    name: 'FAM',
    value: 'FAM:()',
    labelPlaceholder: '',
    desc: {
      en: 'Simple Family',
      cn: '简单同族',
      tw: '簡單同族',
      jp: 'シンプルファミリー番号',
      de: 'Simple Familie',
    },
  },
  {
    name: 'IFAM',
    value: 'IFAM:()',
    labelPlaceholder: '',
    desc: {
      en: 'INPADOC Family',
      cn: 'INPADOC同族',
      tw: 'INPADOC同族',
      jp: 'INPADOCパテントファミリー番号',
      de: 'INPADOC Familie',
    },
  },
  {
    name: 'EFAM',
    value: 'EFAM:()',
    labelPlaceholder: '',
    desc: {
      en: 'Extend Family',
      cn: '扩展同族',
      tw: '擴展同族',
      jp: '同種を拡大する',
      de: 'Erweiterte Familie',
    },
  },
  {
    name: 'CASENO',
    value: 'CASENO:()',
    labelPlaceholder: '',
    desc: {
      en: 'Case Number',
      cn: '案件编号',
      tw: '案件編號',
      jp: '案件番号',
      de: 'Fallnummer',
    },
  },
  {
    name: 'COURT',
    value: 'COURT:()',
    labelPlaceholder: '',
    desc: {
      en: 'Court Name',
      cn: '裁决法庭',
      tw: '裁決法庭',
      jp: '裁判所名',
      de: 'Adjudationsgericht',
    },
  },
  {
    name: 'JUDGE',
    value: 'JUDGE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Judge',
      cn: '审判员',
      tw: '審判員',
      jp: '裁判員',
      de: 'Richter',
    },
  },
  {
    name: 'CHIEF_JUDGE',
    value: 'CHIEF_JUDGE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Chief Judge',
      cn: '审判长',
      tw: '審判長',
      jp: '裁判長',
      de: 'Richter',
    },
  },
  {
    name: 'PLAINTIFF',
    value: 'PLAINTIFF:()',
    labelPlaceholder: '',
    desc: {
      en: 'Plaintiff Name',
      cn: '原告',
      tw: '原告',
      jp: '原告',
      de: 'Kläger',
    },
  },
  {
    name: 'DEFENDANT',
    value: 'DEFENDANT:()',
    labelPlaceholder: '',
    desc: {
      en: 'Defendant Name',
      cn: '被告',
      tw: '被告',
      jp: '被告',
      de: 'Angeklagte',
    },
  },
  {
    name: 'FILING_DATE',
    value: 'FILING_DATE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Filing Year',
      cn: '立案年',
      tw: '立案年',
      jp: '立件年',
      de: 'Einreichung Jahr',
    },
  },
  {
    name: 'CASE_TITLE',
    value: 'CASE_TITLE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Case Title',
      cn: '案件标题',
      tw: '案件標題',
      jp: '案件のタイトル',
      de: 'Titel des Falles',
    },
  },
  {
    name: 'CASE_FULL_TEXT',
    value: 'CASE_FULL_TEXT:()',
    labelPlaceholder: '',
    desc: {
      en: 'Fulltext',
      cn: '案件全文',
      tw: '案件全文',
      jp: '案件の全文',
      de: 'Ganzer Text des Falles',
    },
  },
  {
    name: 'LICENSOR',
    value: 'LICENSOR:()',
    labelPlaceholder: '',
    desc: {
      en: 'Licensor',
      cn: '许可人',
      tw: '許可人',
      jp: 'ライセンサー',
      de: 'Lizenzgeber',
    },
  },
  {
    name: 'LICENSEE',
    value: 'LICENSEE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Licensee',
      cn: '被许可人',
      tw: '被許可人',
      jp: 'ライセンシー',
      de: 'Lizenznehmer',
    },
  },
  {
    name: 'LICNO',
    value: 'LICNO:()',
    labelPlaceholder: '',
    desc: {
      en: 'License Number',
      cn: '许可合同备案号',
      tw: '許可合同備案號',
      jp: 'ライセンス契約番号',
      de: 'Lizenzvertrag Nummer',
    },
  },
  {
    name: 'RI_APPLICANT',
    value: 'RI_APPLICANT:()',
    labelPlaceholder: '',
    desc: {
      en: 'Reexam/Invalid Applicant',
      cn: '复审/无效请求人',
      tw: '複審/無效請求人',
      jp: '再審/無効請求人',
      de: 'Überprüfung / ungültiger Anforderer',
    },
  },
  {
    name: 'RIDN',
    value: 'RIDN:()',
    labelPlaceholder: '',
    desc: {
      en: 'Decision Number',
      cn: '决定号',
      tw: '決定號',
      jp: '判例番号',
      de: 'Entscheidungsnummer',
    },
  },
  {
    name: 'RIDTP',
    value: 'RIDTP:()',
    labelPlaceholder: '',
    desc: {
      en: 'Decision Type',
      cn: '决定类型',
      tw: '決定類型',
      jp: '決定タイプ',
      de: 'Entscheidung Typ',
    },
  },
  {
    name: 'RIDP',
    value: 'RIDP:()',
    labelPlaceholder: '',
    desc: {
      en: 'Decision Points',
      cn: '决定要点',
      tw: '決定要點',
      jp: '決定ポイント',
      de: 'Beschlossene Punkte',
    },
  },
  {
    name: 'RID',
    value: 'RID:()',
    labelPlaceholder: '',
    desc: {
      en: 'Decision',
      cn: '决定',
      tw: '決定',
      jp: '決定',
      de: 'Entscheidung',
    },
  },
  {
    name: 'PLEDGOR',
    value: 'PLEDGOR:()',
    labelPlaceholder: '',
    desc: {
      en: 'Pledgor',
      cn: '质押人',
      tw: '質押人',
      jp: '質権人',
      de: 'Pledger',
    },
  },
  {
    name: 'PLEDGEE',
    value: 'PLEDGEE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Pledgee',
      cn: '质权人',
      tw: '質權人',
      jp: '質権設定者',
      de: 'Pledgee',
    },
  },
  {
    name: 'PLEDGENO',
    value: 'PLEDGENO:()',
    labelPlaceholder: '',
    desc: {
      en: 'Pledge Number',
      cn: '质押登记号',
      tw: '質押登記號',
      jp: '質権登録番号',
      de: 'Versprechen Registrierungsnummer',
    },
  },
  {
    name: 'PLE_STAGE',
    value: 'PLE_STAGE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Pledge Stage',
      cn: '质押备案阶段',
      tw: '質押備案階段',
      jp: '質権届出段階',
      de: 'Versprechen Aufnahme Stufe',
    },
  },
  {
    name: 'CITES_COUNT',
    value: 'CITES_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Cites Count',
      cn: '引用专利数量',
      tw: '引用专利數量',
      jp: '引用件数',
      de: 'Zitieren Zahl',
    },
  },
  {
    name: 'CITEDBY_COUNT',
    value: 'CITEDBY_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Cited By Count',
      cn: '被引用专利数量',
      tw: '被引用专利數量',
      jp: '被引用件数',
      de: 'Zitieren Zahl',
    },
  },
  {
    name: 'EFAM_COUNT',
    value: 'EFAM_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Extended Family Count',
      cn: '扩展同族成员数量',
      tw: '擴展同族成員數量',
      jp: '拡張ファミリーのメンバー数',
      de: 'Anzahl der erweiterten Familienmitglieder',
    },
  },
  {
    name: 'FAM_COUNT',
    value: 'FAM_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Family Count',
      cn: '同族数量',
      tw: '同族數量',
      jp: 'シンプルファミリー数',
      de: 'Zahl der Familien',
    },
  },
  {
    name: 'IFAM_COUNT',
    value: 'IFAM_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'INPADOC Family Count',
      cn: 'INPADOC同族成员数量',
      tw: 'INPADOC同族成員數量',
      jp: 'INPADOCパテントファミリー数',
      de: 'INPADOC Familie Zahl',
    },
  },
  {
    name: 'ANCS_TYPE',
    value: 'ANCS_TYPE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Std. Current Assignee Type',
      cn: '[标]当前申请(专利权)人类型',
      tw: '[標]當前申請(專利權)人類型',
      jp: '[標準]譲受人のタイプ',
      de: 'Standardisierter aktueller Beauftragungstyp',
    },
  },
  {
    name: 'PLE_TYPE',
    value: 'PLE_TYPE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Pledge Type',
      cn: '质押类型',
      tw: '質押類型',
      jp: '質権タイプ',
      de: 'Versprechen Typ',
    },
  },
  {
    name: 'CASE_REGION',
    value: 'CASE_REGION:()',
    labelPlaceholder: '',
    desc: {
      en: 'Case Region',
      cn: '案件地区',
      tw: '案件地區',
      jp: '案件場所',
      de: 'Fallbereich',
    },
  },
  {
    name: 'TRIAL_GRADE',
    value: 'TRIAL_GRADE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Trial Level',
      cn: '诉讼审级',
      tw: '訴訟審級',
      jp: '訴訟審級',
      de: 'Prozess Teststufe',
    },
  },
  {
    name: 'CASE_NATURE',
    value: 'CASE_NATURE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Case Property',
      cn: '案件性质',
      tw: '案件性質',
      jp: '案件の性質',
      de: 'Art des Falles',
    },
  },
  {
    name: 'OUTCOME_STATUS',
    value: 'OUTCOME_STATUS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Litigation Status',
      cn: '案件状态',
      tw: '案件狀態',
      jp: '訴訟状態',
      de: 'Patent Prozess Kläger',
    },
  },
  {
    name: 'EXCLUSIVITY',
    value: 'EXCLUSIVITY:()',
    labelPlaceholder: '',
    desc: {
      en: 'Exclusivity',
      cn: '许可排他性',
      tw: '許可排他性',
      jp: 'ライセンスの排他性',
      de: 'Zulässige Exklusivität',
    },
  },
  {
    name: 'CLAIM_TYPE',
    value: 'CLAIM_TYPE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Claim Type',
      cn: '权利要求类型',
      tw: '權利要求類型',
      jp: '請求項タイプ',
      de: 'Anspruchstyp',
    },
  },
  {
    name: 'SEP_SOURCE',
    value: 'SEP_SOURCE:()',
    labelPlaceholder: '',
    desc: {
      en: 'SEP Source',
      cn: 'SEP数据源',
      tw: 'SEP數據源',
      jp: 'SEPソース',
      de: 'SEP-Standard',
    },
  },
  {
    name: 'SEP_TITLE',
    value: 'SEP_TITLE:()',
    labelPlaceholder: '',
    desc: {
      en: 'SEP Title',
      cn: 'SEP标准标题',
      tw: 'SEP標準標題',
      jp: 'SEP標準タイトル',
      de: 'SEP-Standardtitel',
    },
  },
  {
    name: 'SEP_DECLARANT',
    value: 'SEP_DECLARANT:()',
    labelPlaceholder: '',
    desc: {
      en: 'SEP Declarant',
      cn: 'SEP标准持有者',
      tw: 'SEP標準持有者',
      jp: 'SEP標準ホルダー',
      de: 'SEP Standardhalter',
    },
  },
  {
    name: 'SIMPLE_LEGAL_STATUS',
    value: 'SIMPLE_LEGAL_STATUS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Simple Legal Status',
      cn: '简单法律状态',
      tw: '簡單法律狀態',
      jp: '簡単リーガルステータス',
      de: 'Einfach Rechtsstatus',
    },
  },
  {
    name: 'LITIGATION',
    value: 'LITIGATION:()',
    labelPlaceholder: '',
    desc: {
      en: 'Litigation',
      cn: '专利诉讼',
      tw: '專利訴訟',
      jp: '訴訟情報',
      de: 'Patent Prozess',
    },
  },
  {
    name: 'LICENSE',
    value: 'LICENSE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Licensing',
      cn: '专利许可',
      tw: '專利許可',
      jp: 'ライセンシング情報',
      de: 'Patent Lizenz',
    },
  },
  {
    name: 'PLEDGE',
    value: 'PLEDGE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Pledge',
      cn: '专利质押',
      tw: '專利質押',
      jp: '特許質権',
      de: 'Patent Pledge',
    },
  },
  {
    name: 'REEXAMINVALID',
    value: 'REEXAMINVALID:()',
    labelPlaceholder: '',
    desc: {
      en: 'Re-examination & Invalidation',
      cn: '复审无效',
      tw: '複審無效',
      jp: '再審・無効審判',
      de: 'Ungültige Prüfung',
    },
  },
  {
    name: 'RIDSM',
    value: 'RIDSM:()',
    labelPlaceholder: '',
    desc: {
      en: 'Decision Summary',
      cn: '案由',
      tw: '案由',
      jp: '事件',
      de: 'Decision Summary',
    },
  },
  {
    name: 'RILGS',
    value: 'RILGS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Legal Grounds',
      cn: '法律依据',
      tw: '法律依據',
      jp: '法的根拠',
      de: 'Legal Grounds',
    },
  },
  {
    name: 'GNAME',
    value: 'GNAME:()',
    labelPlaceholder: '',
    desc: {
      en: 'Grouped Assignee',
      cn: '自定义申请人组',
      tw: '自定義申請人組',
      jp: 'カスタム申請者グループ',
      de: 'Grouped Assignee',
    },
  },
  {
    name: 'TACD',
    value: 'TACD:()',
    labelPlaceholder: '',
    desc: {
      en: 'Title/Abstract/Claims/Description',
      cn: '标题/摘要/权利要求/说明书',
      tw: '標題/摘要/權利要求/說明書',
      jp: 'タイトル/要約/主張/手順',
      de: 'Title/Abstract/Claims/Description',
    },
  },
  {
    name: 'LEGAL_EVENT',
    value: 'LEGAL_EVENT:()',
    labelPlaceholder: '',
    desc: {
      en: 'Legal Events',
      cn: '法律事件',
      tw: '法律事件',
      jp: 'リーガルイベント',
      de: 'Rechtliche Fragen',
    },
  },
  {
    name: 'CITE',
    value: 'CITE:()',
    labelPlaceholder: '',
    desc: {
      en: 'Cite Patent',
      cn: '引用专利',
      tw: '引用專利',
      jp: '引用特許',
      de: 'Cite Patent',
    },
  },
  {
    name: 'AN_COUNT',
    value: 'AN_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Count of Original Assignees',
      cn: '原始申请(专利权)人数量',
      tw: '原始申請(專利權)人數量',
      jp: '当初の（特許権者）出願人数',
      de: 'Anzahl der ursprünglichen Beauftragten (Antragsteller)',
    },
  },
  {
    name: 'ANC_COUNT',
    value: 'ANC_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Count of Current Assignees',
      cn: '当前申请(专利权)人数量',
      tw: '當前申請(專利權)人數量',
      jp: '最新の（特許権者）出願人数',
      de: 'Anzahl der aktuellen Beauftragten (Bewerber)',
    },
  },
  {
    name: 'PAGE_COUNT',
    value: 'PAGE_COUNT:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Page Count',
      cn: '文献页数',
      tw: '文獻頁數',
      jp: '出願書類ページ数',
      de: 'Seitenzahl',
    },
  },
  {
    name: 'EXAMINE_DATE',
    value: 'EXAMINE_DATE:[ TO *]',
    labelPlaceholder: ' TO *',
    desc: {
      en: 'Substantive Examination Date',
      cn: '实质审查生效日',
      tw: '實質審查生效日',
      jp: '実体審査の発効日',
      de: 'Substantives Prüfungstermin',
    },
  },
  {
    name: 'EXAMINE_PERIOD',
    value: 'EXAMINE_PERIOD:[ TO *]',
    labelPlaceholder: '0 TO *',
    desc: {
      en: 'Examination Time',
      cn: '审查时长',
      tw: '審查時長',
      jp: '審査期間',
      de: 'Prüfungszeit',
    },
  },
  {
    name: 'PCT_APNO',
    value: 'PCT_APNO:()',
    labelPlaceholder: '',
    desc: {
      en: 'PCT Application Number',
      cn: 'PCT国际申请申请号',
      tw: 'PCT國際申請申請號',
      jp: '国際出願番号',
      de: 'PCT-Anmeldungsnummer',
    },
  },
  {
    name: 'PCT_PN',
    value: 'PCT_PN:()',
    labelPlaceholder: '',
    desc: {
      en: 'PCT Publication Number',
      cn: 'PCT国际申请公开号',
      tw: 'PCT國際申請公開號',
      jp: '国際公開番号',
      de: 'PCT Publication Number',
    },
  },
  {
    name: 'DESC_ENTRANS',
    value: 'DESC_ENTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'English Translated Description',
      cn: '英文机翻说明书',
      tw: '英文機翻說明書',
      jp: '英語翻訳の明細書',
      de: 'Englische maschinell übersetzte Beschreibung',
    },
  },
  {
    name: 'DESC_CNTRANS',
    value: 'DESC_CNTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Chinese Translated Description',
      cn: '中文机翻说明书',
      tw: '中文機翻說明書',
      jp: '中国語翻訳の明細書',
      de: 'Chinesische maschinell übersetzte Beschreibung',
    },
  },
  {
    name: 'TTL_ALL',
    value: 'TTL_ALL:()',
    labelPlaceholder: '',
    desc: {
      en: 'Original Title And Translation',
      cn: '标题原文和翻译',
      tw: '標題原文和翻譯',
      jp: '名称の原文＆翻訳',
      de: 'Originaltitel und Übersetzung',
    },
  },
  {
    name: 'ABST_ALL',
    value: 'ABST_ALL:()',
    labelPlaceholder: '',
    desc: {
      en: 'Original Abstract And Translation',
      cn: '摘要原文和翻译',
      tw: '摘要原文和翻譯',
      jp: '要約の原文＆翻訳',
      de: 'Original Abstract und Übersetzung',
    },
  },
  {
    name: 'CLMS_ALL',
    value: 'CLMS_ALL:()',
    labelPlaceholder: '',
    desc: {
      en: 'Original Claims And Translation',
      cn: '权利要求原文和翻译',
      tw: '權利要求原文和翻譯',
      jp: '請求項の原文＆翻訳',
      de: 'Originalansprüche und Übersetzung',
    },
  },
  {
    name: 'DESC_ALL',
    value: 'DESC_ALL:()',
    labelPlaceholder: '',
    desc: {
      en: 'Original Description And Translation',
      cn: '说明书原文和翻译',
      tw: '說明書原文和翻譯',
      jp: '明細書の原文＆翻訳',
      de: 'Originalbeschreibung und Übersetzung',
    },
  },
  {
    name: 'TA_ALL',
    value: 'TA_ALL:()',
    labelPlaceholder: '',
    desc: {
      en: 'Original TA And Translation',
      cn: '标题/摘要原文和翻译',
      tw: '標題/摘要原文和翻譯',
      jp: '名称/要約の原文＆翻訳',
      de: 'Originaltitel / Abstract und Übersetzung',
    },
  },
  {
    name: 'TAC_ALL',
    value: 'TAC_ALL:()',
    labelPlaceholder: '',
    desc: {
      en: 'Original TAC And Translation',
      cn: '标题/摘要/权利要求原文和翻译',
      tw: '標題/摘要/權利要求原文和翻譯',
      jp: '名称/要約/請求項の原文＆翻訳',
      de: 'Originaltitel / Abstract / Ansprüche und Übersetzung',
    },
  },
  {
    name: 'TACD_ALL',
    value: 'TACD_ALL:()',
    labelPlaceholder: '',
    desc: {
      en: 'Original TACD And Translation',
      cn: '标题/摘要/权利要求/说明书原文和翻译',
      tw: '標題/摘要/權利要求/說明書原文和翻譯',
      jp: '名称/要約/請求項/明細書の原文＆翻訳',
      de: 'Originaltitel / Abstract / Claims / Beschreibung und Übersetzung',
    },
  },
  {
    name: 'DESC_F',
    value: 'DESC_F:()',
    labelPlaceholder: '',
    desc: {
      en: 'Technical Field',
      cn: '技术领域',
      tw: '技術領域',
      jp: '技術分野',
      de: 'Technical Field',
    },
  },
  {
    name: 'DESC_B',
    value: 'DESC_B:()',
    labelPlaceholder: '',
    desc: {
      en: 'Background Art',
      cn: '背景技术',
      tw: '背景技術',
      jp: '背景技術',
      de: 'Background Art',
    },
  },
  {
    name: 'DESC_S',
    value: 'DESC_S:()',
    labelPlaceholder: '',
    desc: {
      en: 'Summary of Invention',
      cn: '发明内容',
      tw: '發明內容',
      jp: '発明の概要',
      de: 'Summary of Invention',
    },
  },
  {
    name: 'DESC_D',
    value: 'DESC_D:()',
    labelPlaceholder: '',
    desc: {
      en: 'Brief Description of Drawings',
      cn: '附图说明',
      tw: '附圖說明',
      jp: '図面の簡単な説明',
      de: 'Brief Description of Drawings',
    },
  },
  {
    name: 'DESC_E',
    value: 'DESC_E:()',
    labelPlaceholder: '',
    desc: {
      en: 'Description of Embodiments',
      cn: '具体实施方式',
      tw: '具體實施方式',
      jp: '発明を実施するための形態',
      de: 'Description of Embodiments',
    },
  },
]

const SEARCH_FIELDS_US = [
  {
    name: 'TTL_JPTRANS',
    value: 'TTL_JPTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Japanese Translated Title',
      cn: '日文机翻标题',
      tw: '日文機翻標題',
      jp: '日本語機械翻訳の名称',
      de: 'Japanisch übersetzter Titel',
    },
  },
  {
    name: 'ABST_JPTRANS',
    value: 'ABST_JPTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Japanese Translated Abstract',
      cn: '日文机翻摘要',
      tw: '日文機翻摘要',
      jp: '日本語機械翻訳の要約',
      de: 'Japanisch übersetzte Zusammenfassung',
    },
  },
  {
    name: 'CLMS_JPTRANS',
    value: 'CLMS_JPTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Japanese Translated Claims',
      cn: '日文机翻权利要求',
      tw: '日文機翻權利要求',
      jp: '日本語機械翻訳の請求項',
      de: 'Japanisch übersetzte Ansprüche',
    },
  },
  {
    name: 'DESC_JPTRANS',
    value: 'DESC_JPTRANS:()',
    labelPlaceholder: '',
    desc: {
      en: 'Japanese Translated Description',
      cn: '日文机翻说明书',
      tw: '日文機翻說明書',
      jp: '日本語機械翻訳の明細書',
      de: 'Japanisch übersetzte Beschreibung',
    },
  },
]

const LOGIC_FIELDS = [
  {
    name: LOGIC_OPERATOR_OR,
    value: 'OR ',
    labelPlaceholder: '',
    desc: {
      en: 'E.g. solar OR wind',
      cn: '例：太阳能 OR 风能',
      tw: '例：太阳能 OR 风能',
      jp: '例: 携帯端末 OR 携帯電話',
      de: 'z.B: Sonnen- OR Windenergie',
    },
  },
  {
    name: LOGIC_OPERATOR_AND,
    value: 'AND ',
    labelPlaceholder: '',
    desc: {
      en: 'E.g. solar AND cell',
      cn: '例：太阳能 AND 风能',
      tw: '例：太阳能 AND 风能',
      jp: '例: 自動 AND 販売機',
      de: 'z.B: Sonnen- AND Windenergie',
    },
  },
  {
    name: LOGIC_OPERATOR_NOT,
    value: 'NOT ',
    labelPlaceholder: '',
    desc: {
      en: 'E.g. solar NOT wind',
      cn: '例：太阳能 NOT 风能',
      tw: 'E.g. solar NOT wind',
      jp: 'E.g. solar NOT wind',
      de: 'z.B: solar NOT wind',
    },
  },
]

const DEFAULT_FIELDS = {
  cn: ['TAC', 'TA', 'DESC', 'CLMS', 'ANC', 'IN', 'IPC', 'PBD'],
  default: ['TAC', 'TA', 'DESC', 'CLMS', 'ANCS'],
  other: [
    ...DEFAULT_KEYWORD_FIELDS,
    ...DEFAULT_CLASSIFICATION_NUMBER_FIELDS,
    ...DEFAULT_ASSIGNEE_FIELDS,
    ...DEFAULT_OTHER_FIELDS,
  ],
}

const ANALYSIS_FIELDS = [
  {
    name: 'AN_FACET_CN',
  },
  {
    name: 'AN_FACET',
  },
  {
    name: 'APN',
  },
  {
    name: 'IN_FACET',
  },
  {
    name: 'IPC_FACET',
  },
  {
    name: 'IPC_CLASS',
  },
  {
    name: 'IPC_SUB_CLASS',
  },
  {
    name: 'IPC_MAIN_GROUP',
  },
  {
    name: 'IPC_SECTION',
  },
  {
    name: 'APD_Y',
  },
  {
    name: 'AN_ST_FACET',
  },
  {
    name: 'AN_ST',
  },
  {
    name: 'COUNTRY',
  },
  {
    name: 'CPC_FACET',
  },
  {
    name: 'CPC_SECTION',
  },
  {
    name: 'CPC_CLASS',
  },
  {
    name: 'CPC_SUB_CLASS',
  },
  {
    name: 'CPC_MAIN_GROUP',
  },
  {
    name: 'GBC_FACET',
  },
  {
    name: 'GBC_SECTION',
  },
  {
    name: 'GBC_DIVISION',
  },
  {
    name: 'GBC_GROUP',
  },
  {
    name: 'LOC_CLASS',
  },
  {
    name: 'LOC_FACET',
  },
  {
    name: 'UPC_FACET',
  },
  {
    name: 'UPC_CLASS',
  },
  {
    name: 'PBD_Y',
  },
  {
    name: 'LEGAL_EVENT',
  },
  {
    name: 'ATC_CN_FACET',
  },
  {
    name: 'INS_FACET',
  },
  {
    name: 'ATC_FACET',
  },
  {
    name: 'AN_ADDRESS',
  },
  {
    name: 'AN_COUNTRY',
  },
  {
    name: 'AN_PROVINCE',
  },
  {
    name: 'F_AN',
  },
  {
    name: 'ANS_TYPE',
  },
  {
    name: 'INS',
  },
  {
    name: 'TRANSFER_BEFORE',
  },
  {
    name: 'TRANSFER_AFTER',
  },
  {
    name: 'IN_ADD',
  },
  {
    name: 'DOCUMENT_TYPE',
  },
  {
    name: 'INCHI_TITLE',
  },
  {
    name: 'INCHI_ABST',
  },
  {
    name: 'INCHI_CLAIMS',
  },
  {
    name: 'INCHI_DESC',
  },
  {
    name: 'POLYMER',
  },
  {
    name: 'SEQ_ID',
  },
  {
    name: 'LS',
  },
  {
    name: 'TRIAL_GRADE_CN',
  },
  {
    name: 'OUTCOME_JUDGEMENT',
  },
  {
    name: 'EXCLUSIVITY_CN',
  },
  {
    name: 'TRANS_EFDT',
  },
  {
    name: 'TYPE',
  },
  {
    name: 'RIDTP_CN',
  },
  {
    name: 'LITIGATION_COUNTRY',
  },
  {
    name: 'ANCS_FACET',
  },
  {
    name: 'RD_STATUS',
  },
  {
    name: 'RD_ABANDON',
  },
  {
    name: 'PV_VA',
  },
  {
    name: 'SEQ_CLAIMS_ID',
  },
  {
    name: 'AN_ADD',
  },
  {
    name: 'ICL_FACET',
  },
  {
    name: 'PBDT_YEAR',
  },
  {
    name: 'ANS_ID',
  },
  {
    name: 'ANC_BEFORE_FACET',
  },
  {
    name: 'CPC_SUB_GROUP',
  },
  {
    name: 'IPC_SUB_GROUP',
  },
  {
    name: 'ANC_AFTER_FACET',
  },
  {
    name: 'CREATE_TS',
  },
  {
    name: 'AT_CN_FACET',
  },
  {
    name: 'AT_FACET',
  },
  {
    name: 'APD_YM',
  },
  {
    name: 'PBD_YM',
  },
  {
    name: 'PRIORITY_COUNTRY',
  },
  {
    name: 'MIPC_SECTION',
  },
  {
    name: 'MIPC_CLASS',
  },
  {
    name: 'MIPC_SUB_CLASS',
  },
  {
    name: 'MIPC_MAIN_GROUP',
  },
  {
    name: 'MIPC_FACET',
  },
  {
    name: 'FADL_COUNTRY',
  },
  {
    name: 'LIT_FILEDT',
  },
  {
    name: 'PRESIDING_EXAMINER',
  },
  {
    name: 'JUROR',
  },
  {
    name: 'PANEL_LEADER',
  },
  {
    name: 'RISUM',
  },
  {
    name: 'RIGR',
  },
  {
    name: 'RIFD',
  },
  {
    name: 'ISD_Y',
  },
  {
    name: 'FAM_COUNTRY',
  },
]

const DEFAULT_SYNTAX_VALUES = {
  AUTHORITY: ['CN', 'US', 'GB', 'WO', 'EP', 'FR', 'DE', 'CH', 'JP'],
  CASE_REGION: ['北京', '上海', '广东', '江苏', '浙江'],
}
const RANGE_SAMPLE = [
  {
    name: '[1 TO 50000]',
    value: '',
  },
]

const RANGE_SAMPLE_SHORT = [
  {
    name: '[1 TO 10]',
    value: '',
  },
]
const DATE_SAMPLE = [
  {
    name: '[1893 TO 2019]',
    value: '',
  },
  {
    name: '[189312 TO 201912]',
    value: '',
  },
  {
    name: '[18931226 TO 20191231]',
    value: '',
  },
]

// 临时方案，后期会删掉，找其他比较好的方案
const serviceArea = get(window, 'zPREFACE.globalConfig.serviceArea', 'us')
if (serviceArea === 'us') {
  SEARCH_FIELDS = SEARCH_FIELDS.concat(SEARCH_FIELDS_US)
}
export {
  SEARCH_FIELDS,
  SEARCH_FIELDS_US,
  LOGIC_FIELDS,
  ANALYSIS_FIELDS,
  DEFAULT_FIELDS,
  DEFAULT_SYNTAX_VALUES,
  RANGE_SAMPLE,
  RANGE_SAMPLE_SHORT,
  DATE_SAMPLE,
}
