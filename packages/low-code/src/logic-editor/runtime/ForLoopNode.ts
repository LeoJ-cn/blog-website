import { ProcessBaseNode } from './ProcessBaseNode';
import { OperationComponentTree } from '../../types/edit-page';
import { Schema } from '../../types/schema';
import { SimpleProcessData } from '../../types/process';
import _ from 'lodash';

interface ForLoopAttrs {
  array?: string[];
  itemLabel?: string;
  item?: string;
}

export class ForLoopNode extends ProcessBaseNode<ForLoopAttrs> {
  public attrsChange(
    key: keyof ForLoopAttrs,
    value: ForLoopAttrs[keyof ForLoopAttrs],
    currentOperation: OperationComponentTree,
  ): void | Promise<void> {
    const { component } = this;
    this.attrs = component.data as any;
    switch (key) {
      case 'array':
        this.attrs.itemLabel = 'item_' + this.getLabelByVariable(value as string[]);
        this.attrs.item = 'item' + component.id;
        break;
      default:
        break;
    }
    this.modifyText();
    this.assignNodeData();
  }

  public beforeOperationRender(key: keyof ForLoopAttrs, currentOperation: OperationComponentTree): void {
  }

  public dataSchema(): Schema | undefined {
    return undefined;
  }

  public generate(): SimpleProcessData[] {
    const { attrs, component } = this;
    if (!attrs.array) {
      return [];
    }
    return [
      this.generateSimpleProcessData({
        type: 'block_foreach',
        value: {
          item: attrs.item,
          array: this.createSimpleProcessData('variable', attrs.array),
        },
      }),
    ];
  }

  public modifyText(): void {
    const { attrs, component } = this;
    let text = '暂无数据';
    let enText = 'No data';

    if (attrs.array) {
      text = `遍历数组 "${this.getLabelByVariable(attrs.array)}"`;
      enText = `Iterate over the array "${this.getLabelByVariable(attrs.array)}"`;
    }

    const node = component.children.find((i) => i.tag === 'ProcessChildStart');
    this.modifyNodeTextByInsId(text, node);
    this.modifyNodeEnTextByInsId(enText, node);
  }

}

