import { ProcessBaseNode } from './ProcessBaseNode';
import { SimpleProcessData } from '../../types/process';
import { DataType, Schema } from '../../types/schema';
import { OperationComponentTree } from '../../types/edit-page';
import _ from 'lodash';

interface ShowMessageAttrs {
  messageType?: string;
  contentText?: string;
  contentVar?: string[];
  contentLocale?: string;
  during?: number;
  duringVar?: string[];
}

const messageTypeList = [
  {
    label: '消息',
    value: 'info',
  },
  {
    label: '成功',
    value: 'success',
  },
  {
    label: '警告',
    value: 'warning',
  },
  {
    label: '错误',
    value: 'error',
  },
  {
    label: '加载中',
    value: 'loading',
  },
];

export class ShowMessageNode extends ProcessBaseNode<ShowMessageAttrs> {
  public attrsChange(key: keyof ShowMessageAttrs, value: ShowMessageAttrs[keyof ShowMessageAttrs], currentOperation: OperationComponentTree): void | Promise<void> {
    const { component } = this;
    this.attrs = component.data as any;
    this.modifyText();
    this.assignNodeData();
  }

  public beforeOperationRender(key: keyof ShowMessageAttrs, currentOperation: OperationComponentTree): void {
  }

  public dataSchema(): Schema | undefined {
    return undefined;
  }

  public generate(): SimpleProcessData[] {
    const { attrs } = this;
    let content = undefined;
    let duration = undefined

    if (attrs.contentLocale) {
      content = this.createSimpleProcessData('locale', attrs.contentLocale);
    } else if (attrs.contentVar) {
      content = this.createSimpleProcessData('variable', attrs.contentVar);
    } else {
      content = this.createSimpleProcessData('string', attrs.contentText || '');
    }

    if (attrs.duringVar) {
      duration = this.createSimpleProcessData('variable', attrs.duringVar);
    } else if (typeof attrs.during === 'number') {
      duration = this.createSimpleProcessData('number', attrs.during);
    }

    const node = this.generateSimpleProcessData({
      type: 'show_message',
      mutation: {
        arguments: 'message_duration',
      },
      value: {
        type: attrs.messageType,
        content,
        message_duration: duration,
      },
    });

    return [node];
  }

  public modifyText(): void {
    const { attrs } = this;
    let text = '暂无数据';
    let enText = 'No data';

    if (attrs.messageType) {
      text = '提醒类型: ' + messageTypeList.find((i) => i.value === attrs.messageType).label + '\n提醒文字: ';
      enText = 'type: ' + attrs.messageType + '\nmessage: ';
    }

    if (attrs.contentLocale) {
      text += `多语言-${this.getLocaleLabelByValue(attrs.contentLocale)}`;
      enText += `Locale-${this.getLocaleLabelByValue(attrs.contentLocale)}`;
    } else if (attrs.contentVar) {
      text += `"${this.getLabelByVariable(attrs.contentVar)}"`;
      enText += `"${this.getLabelByVariable(attrs.contentVar)}"`;
    } else {
      text += (attrs.contentText || '');
      enText += (attrs.contentText || '');
    }

    this.modifyNodeTextByInsId(text);
    this.modifyNodeEnTextByInsId(enText);
  }

}

