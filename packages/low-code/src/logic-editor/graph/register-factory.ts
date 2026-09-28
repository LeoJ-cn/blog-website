import { IG6 } from '../interface';
import registerBehavior from './behavior';
import registerNode from './shape/register-nodes';
import registerEdge from './shape/register-edges';

export default (G6: IG6) => {
  registerNode(G6);
  registerEdge(G6);
  registerBehavior(G6);
};

