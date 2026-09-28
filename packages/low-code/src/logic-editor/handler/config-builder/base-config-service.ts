import { INodeConfig, IPositon } from "../../interface";
import { LogicEditorService } from "../../service/logic-service";
import { INodeConfigService } from "./interface";

const {
  getParamAnchorConfig,
  getFlowAnchorConfig,
} = LogicEditorService;
export class BaseConfigService implements INodeConfigService {
  getConfig(position: IPositon, cfg?: INodeConfig) {
    return {} as INodeConfig;
  }
}

