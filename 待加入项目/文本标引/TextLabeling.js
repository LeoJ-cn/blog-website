import '@/lib/TextLabeling.css';

/**
 * 文本标注
 */

// @param {config}：Demo
// {
//   container: Node or selector string, 推荐Node 【必要参数】
//   checkCharacters:Array,  初始检索字符，添加标引结构【非必要】
//   exclude: Array， 选区需要排除的dom 【非必要】
//   useMenu：Boolean, 是否启用鼠标右键菜单功能 【非必要】
//   callback：Object, 设置添加和删除的回调函数 【非必要】
// }
function TextLabeling(config) {
    //缓存配置项
    this.config = config;
    //使用标引的容器
    this.container = config.container instanceof Node ? config.container : document.querySelector(config.container);
    //当前标引区域的字符串
    this.currentLabelingStr = '';
    //初始检索字符：添加标引结构
    this.checkCharacters = config.checkCharacters;
    //选区包含的dom，取消此次标引的操作
    this.exclude = config.exclude;
    //鼠标右键功能区
    this.useMenu = config.useMenu;
    this.menuBox = null;
    //回调
    this.callback = Object.create({
        //容器内每个选区通用方法
        // beforeAdd: function() {
        //   console.log('beforeAdd')
        // },
        // beforeRemove: function(fn) {
        //   console.log('beforeRemove')
        // },
        afterAdd: function(labelingStr) {
            console.log(labelingStr);
        },
        afterRemove: function(labelingStr) {
            console.log(labelingStr);
        }
    });
    if (Object.prototype.toString.call(config.callback) === '[object Object]') {
        this.callback = config.callback;
    }
    TextLabeling.addInstanceToCache(this.container, this);
}
//TODO:检索字符，添加标引结构
TextLabeling.prototype.addLabelingDomStructure = function() {
    //
};
//获取当前选区所在的dom
TextLabeling.prototype.getCurrentSelectionContainer = function() {
    var sel = window.getSelection(),
        currentNode;
    if (sel.type === 'None') {
        currentNode = null;
    } else {
        currentNode = sel.getRangeAt(0).commonAncestorContainer.parentElement;
    }
    return currentNode;
};
// //获取选区所在区域的父元素（用于检索是不是 标引模式的容器内）
// TextLabeling.prototype.getRangeContainDom = function() {
//     var sel = window.getSelection(),
//         currentNode;
//     if (sel.type === 'None') {
//         currentNode = null;
//     } else {
//         currentNode = sel.getRangeAt(0).commonAncestorContainer.parentElement;
//     }
// };

//节点的包含的关系[包含本身]
TextLabeling.prototype.isChildOf = (function() {
    var _isInContainer = false;
    //排除style和script标签
    function filterNode(nodeList) {
        var nodeArray = [];
        for (var i = 0; i < nodeList.length; i++) {
            var node = nodeList[i];
            if (/script|style/.test(node.localName.toLowerCase())) {
                continue;
            }
            nodeArray.push(node);
        }
        return nodeArray;
    }
    //检查逻辑
    function checkIsInContainer(targetNode, fatherNode) {
        if (!fatherNode) {
            return;
        }
        if (targetNode === fatherNode) {
            _isInContainer = true;
        } else {
            var nodeChildren = fatherNode.children;
            nodeChildren = filterNode(nodeChildren);
            if (!nodeChildren.length) {
                return;
            }
            nodeChildren.forEach(function(itemNode) {
                // var childrenLenth = itemNode.children ? itemNode.children.length : 0;
                checkIsInContainer(targetNode, itemNode);
            });
        }
    }
    return function(targetNode, fatherNode) {
        _isInContainer = false;
        if (targetNode instanceof Node && fatherNode instanceof Node) {
            checkIsInContainer(targetNode, fatherNode);
        }
        return _isInContainer;
    };
})();
//关闭选区
TextLabeling.prototype.closeSelection = function() {
    var sel = window.getSelection(),
        range = sel.getRangeAt(0);
    range.collapse();
    sel.removeAllRanges();
};
//检查选区是否在注册的容器内
TextLabeling.prototype.isInContainer = function() {
    return this.isChildOf(this.getCurrentSelectionContainer(), this.container);
};
//绑定事件
TextLabeling.prototype.bindEvent = function() {
    var that = this;
    // document.addEventListener("selectionchange", function(e) {
    //   if (that.isInContainer()) {
    //     console.log("in");
    //   } else {
    //     console.log("out");
    //   }
    // });

    //阻止浏览器默认行为
    function stopDefault(e) {
        if (e && e.preventDefault) {
            e.preventDefault();
        } else {
            window.event.returnValue = false;
            return false;
        }
    }

    //右键菜单
    that.container.addEventListener('contextmenu', function(e) {
        if (that.isInContainer()) {
            console.log('in');
            if (that.useMenu) {
                stopDefault(e);
                that.setMenu();
                that.displayMenu(e);
            }
        } else {
            console.log('out');
        }
    });

    that.container.addEventListener('click', function(e) {
        //右键菜单：添加标引
        if (Array.prototype.join.call(e.target.classList, ' ').indexOf('tlm-add-btn') !== -1) {
            if (that.isAllowAdditions()) {
                that.addLabeling();
                that.hideMenu();
            } else {
                alert('当前区域已存在标引，请删除后添加！');
            }
        }

        //删除标引
        var currentNode = e.target;
        if (Array.prototype.join.call(currentNode.classList, ' ').indexOf('ta-del-button') !== -1) {
            that.removeLabeling(currentNode);
        }

        //隐藏右键菜单
        var menuBox = that.menuBox;
        if (menuBox && !that.isChildOf(e.target, menuBox)) {
            that.hideMenu();
        }
    });
};
//选区不存在|只有光标显示:禁止新增操作
TextLabeling.prototype.rangeIsLegal = function() {
    var sel = window.getSelection();
    return sel && sel.toString() ? true : false;
};
//添加标引
//接口暴露， 获取选区所在的实例， 调用标引方法
TextLabeling.prototype.addApi = function(actionCfg) {
    if (!this.rangeIsLegal()) {
        return;
    }
    var currentNode = this.getCurrentSelectionContainer(),
        instance = TextLabeling.getInstanceWhereCurrentSelectionIsIn(currentNode, this);
    if (instance) {
        this.addLabeling.call(instance, actionCfg);
    }
};
TextLabeling.prototype.addLabeling = function(actionCfg) {
    //复制选区内的html结构，文档片段
    var sel = window.getSelection();
    this.currentLabelingStr = actionCfg['currentLabelingStr'] = sel.toString(); //dom移除前获取字符

    //新增前验证
    if (actionCfg && typeof actionCfg.isAddValid === 'function' && !actionCfg.isAddValid(actionCfg)) {
        return;
    }

    var wrap_range = window.getSelection().getRangeAt(0),
        cloneHtml = wrap_range.extractContents(),
        wrap_span = document.createElement('span');
    wrap_span.actionCfg = actionCfg;
    wrap_span.classList.add('tips-area');
    if (actionCfg && actionCfg.labelingStyle && typeof actionCfg.labelingStyle === 'object') {
        let _labelingStyle = actionCfg.labelingStyle;
        for (var cssKey in _labelingStyle) {
            cssKey === 'classNames'
                ? wrap_span.classList.add(_labelingStyle[cssKey])
                : (wrap_span.style[cssKey] = _labelingStyle.styles[cssKey]);
        }
    }
    wrap_span.innerHTML = '<span class="ta-text"></span><span class="ta-del-button">x</span>';
    wrap_span.querySelector('.ta-text').appendChild(cloneHtml);
    wrap_range.deleteContents();
    wrap_range.insertNode(wrap_span);
    wrap_range.collapse();
    // window.getSelection().removeAllRanges(); //保证range唯一，用于检测选区包含的dom
    this && this.callback.afterAdd(actionCfg);
};
//删除标引
TextLabeling.prototype.removeLabeling = function(currentNode) {
    var origin_box = currentNode.previousElementSibling,
        origin_html,
        sel = window.getSelection(),
        delete_area = currentNode.parentNode,
        wrap_range = document.createRange(),
        actionCfg = delete_area.actionCfg;

    //删除前验证
    if (actionCfg && typeof actionCfg.isRemoveValid === 'function' && !actionCfg.isRemoveValid(actionCfg)) {
        return;
    }

    //选中原始文本的区域，利用range对象 进行html拆解
    sel.removeAllRanges(wrap_range);
    wrap_range.selectNodeContents(origin_box);
    sel.addRange(wrap_range);
    this.currentLabelingStr = sel.toString();
    origin_html = wrap_range.extractContents();

    //删除标引区域
    // sel.removeAllRanges();
    wrap_range.selectNode(delete_area);
    // sel.addRange(wrap_range);
    wrap_range.deleteContents();

    //恢复原始文本html
    wrap_range.insertNode(origin_html);
    wrap_range.collapse();
    this && this.callback.afterRemove(actionCfg);
};

//是否允许添加：包含标引的节点，则取消本次操作
TextLabeling.prototype.isAllowAdditions = function(initCheckDom) {
    var isExisted = false,
        sel = window.getSelection(),
        range = sel.getRangeAt(0),
        containerDom = range.cloneContents().children,
        checkDom = initCheckDom || 'ta-del-button';
    if (!containerDom || !containerDom.length) {
        isExisted = false;
    } else {
        if (typeof checkDom === 'string') {
            var container_class = '';
            for (let i = 0; i < containerDom.length; i++) {
                container_class += containerDom[i].className + ' ';
            }
            isExisted = container_class.indexOf('tips-area') === -1 ? false : true;
        } else {
            for (let i = 0; i < containerDom.length; i++) {
                if (checkDom === containerDom[i]) {
                    isExisted = true;
                    break;
                }
            }
        }
    }
    return !isExisted;
};

//右键功能
TextLabeling.prototype.setMenu = function() {
    var tpl = '';
    tpl += '<div class="text-labeling-menu">';
    tpl += '     <button class="tlm-add-btn">Add Labeling</button>';
    tpl += '</div>';
    var menuBox = document.querySelector('.text-labeling-box');
    if (menuBox) {
        menuBox.innerHTML = tpl;
    } else {
        var menu_node = document.createElement('div');
        menu_node.className = 'text-labeling-box';
        menu_node.innerHTML = tpl;
        document.body.appendChild(menu_node);
        this.menuBox = menu_node;
    }
};
TextLabeling.prototype.hideMenu = function() {
    if (!this.menuBox) {
        return;
    }
    this.menuBox.style.display = 'none';
};
TextLabeling.prototype.displayMenu = function(e) {
    if (!this.menuBox) {
        return;
    }
    var styleList = this.menuBox.style;
    styleList.display = 'block';
    styleList.left = e.clientX + 30 + 'px';
    styleList.top = e.clientY - 10 + 'px';
};
//加载css
TextLabeling.prototype.loadCss = function() {
    // var scripts = document.scripts,
    //   styleSheets = document.styleSheets,
    //   isCssLoaded = false,
    //   baseUrl = "";
    // Array.prototype.forEach.call(styleSheets, function(item) {
    //   if (item.href && item.href.indexOf("TextLabeling.css")) {
    //     isCssLoaded = true;
    //   }
    // });
    // if (isCssLoaded) {
    //   return;
    // }
    // Array.prototype.forEach.call(scripts, function(item) {
    //   if (item.src && item.src.indexOf("TextLabeling.js")) {
    //     debugger;
    //     console.log("TextLabeling.js路径：" + item.src, item);
    //   }
    // });
    // console.log("isCssLoaded:" + isCssLoaded);
};

//销毁
TextLabeling.prototype.destroy = function() {
    TextLabeling.removeInstanceFromCache(this.container);
};
//初始化
TextLabeling.prototype.init = function() {
    // this.loadCss();
    this.bindEvent();
};

//缓存实例--数据结构
// [
//   {
//     node:node, //实例化的节点
//     instance:instance //实例
//   },
//   ...
// ]
TextLabeling.instanceCache = [];
//获取实例的位置信息
TextLabeling.getInstanceIndex = function(node) {
    var _index = -1;
    this.instanceCache.forEach(function(item, index) {
        if (item.node === node) {
            _index = index;
        }
    });
    return _index;
};
//添加：缓存实例
TextLabeling.addInstanceToCache = function(node, instance) {
    var _index;
    if (!node) {
        var _number = typeof this.count === 'number' ? ++this.count : 0;
        node = 'GetCommonApi' + _number;
        _index = -1;
    } else {
        _index = this.getInstanceIndex(node);
    }
    if (_index === -1) {
        this.instanceCache.push({
            node: node,
            instance: instance
        });
    } else {
        this.instanceCache[_index].instance = instance;
    }
};
//删除：实例记录
TextLabeling.removeInstanceFromCache = function(node) {
    var _index = this.getInstanceIndex(node);
    if (_index !== -1) {
        this.instanceCache.splice(_index, 1);
    }
};
//返回当前选区所在的实例
TextLabeling.getInstanceWhereCurrentSelectionIsIn = function(node, scope) {
    var instance;
    this.instanceCache.forEach(function(item) {
        if (scope.isChildOf(node, item.node)) {
            instance = item.instance;
        }
    });
    return instance;
};
export default TextLabeling;
