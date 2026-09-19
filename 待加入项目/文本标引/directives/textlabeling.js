import TextLabeing from '@/lib/TextLabeling';
//TODO: 1. 保持高亮/化学同步更新   2.work_space接口更新【serch模块和patent-view模块同步更新】  3.初始打开标引模式，检索标引的字段并重新渲染

//用法demo：<div v-textlabeling="{config:testConfig}">...</div>
//需要使用使用

/**
 * _setting 实例化参数
 * {
 *    container:el,
 *    useMenu:false,
 *    callback:{
 *        afterAdd:function(){}
 *        ...
 *    }
 * }
 * 
 * 
 * 
 * <div v-textlabeling="{config:textLabelConfig}"></div>
 *   textLabelConfig: {
                callback: {
                    afterAdd: actionData => {
                        let _currentLabelingStr = actionData.currentLabelingStr.trim();
                        switch (actionData.attrs.field_type) {
                            case 'DATE': {
                                _currentLabelingStr = moment(_currentLabelingStr).format('YYYYMMDD');
                                break;
                            }
                            case 'NUM': {
                                // _currentLabelingStr = parseFloat(_currentLabelingStr);
                                break;
                            }
                        }
                        const that = this;
                        addTextLabelToCustomFields(actionData.attrs.field_id, _currentLabelingStr, actionData.patentId)
                            .then(res => {
                                console.log(res);
                                this.$eventHub.$emit('PATENT_CHANGE', actionData.patentId);
                                if (res.response.status !== 200) {
                                    return that.$eventHub.$emit('ALERT', {
                                        type: 'error',
                                        message: res.response.data.errorMsg
                                    });
                                }
                            })
                            .catch(e => {
                                console.log('add text label to custom fields failed', e);
                                that.$eventHub.$emit('ALERT', {
                                    type: 'error',
                                    message: e.errorMsg
                                });
                            });
                    },
                    afterRemove: actionData => {
                        const that = this;
                        addTextLabelToCustomFields(actionData.attrs.field_id, '', actionData.patentId)
                            .then(res => {
                                console.log(res);
                                this.$eventHub.$emit('PATENT_CHANGE', actionData.patentId);
                                if (res.response.status !== 200) {
                                    return that.$eventHub.$emit('ALERT', {
                                        type: 'error',
                                        message: res.response.data.errorMsg
                                    });
                                }
                            })
                            .catch(e => {
                                console.log('remove text label to custom fields failed', e);
                                that.$eventHub.$emit('ALERT', {
                                    type: 'error',
                                    message: e.errorMsg
                                });
                            });
                    }
                }
            },
 */
export default {
    inserted(el, bind) {
        var _config;
        if (!bind.value) {
            _config = {
                container: el
            };
        } else {
            var _setting = bind.value.config;
            if (_setting) {
                _config = {
                    container: el,
                    callback: _setting.callback,
                    useMenu: _setting.useMenu
                };
            } else {
                _config = {
                    container: el
                };
            }
        }
        el.labelingInstance = new TextLabeing(_config);
        el.labelingInstance.init();
    },
    // componentUpdated(el, b, c, d, e) {
    //     // debugger;
    // },
    unbind(el) {
        el.labelingInstance.destroy();
    },
    CommonApi: (function() {
        var _instance = new TextLabeing({ container: 'GetTextLabelingApi' });
        return {
            add: function(addCfg) {
                _instance.addApi(addCfg);
                _instance.hideMenu();
            },
            remove: function() {
                _instance.removeLabeling();
            }
        };
    })()
    // bind: function(el, binding) {

    // }
};
