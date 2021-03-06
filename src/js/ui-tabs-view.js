/**
 * Created by zhang on 2017/6/7.
 */
import uiTabsModule from './ui-tabs';
import uiTabsHtml from '../tpls/ui-tabs.html';
import '../scss/ui-tabs.scss';
import './ui-tabs-menu';
// import './ui-tabs-drag';

uiTabsModule.directive('uiTabsView', function ($rootScope, $timeout, $controller, $compile, uiTabs) {
    return {
        restrict: 'EAC',
        priority: 400,
        scope: true,
        replace: true,
        template: uiTabsHtml,
        link: function (scope, element) {

            scope.tabs = uiTabs.tabs;
            scope.current = uiTabs.current;

            scope.$on('tabOpenStarting', tabOpenStarting);
            scope.$on('tabOpenSuccess', tabOpenSuccess);
            scope.$on('tabOpenError', tabOpenError);
            scope.$on('tabCloseSuccess', tabCloseSuccess);
            scope.$on('tabChangeSuccess', tabChangeSuccess);
            scope.$on('tabRefresh', tabRefresh);
            scope.$on('$destroy', uiTabs.closeAll); // 指令销毁时，清楚所有tab

            // 如果不存在打开的tab，则打开默认的tab
            if (!scope.current) {
                uiTabs.open(null);
            }

            // 关闭tab
            scope.close = function (e, tab) {
                tab.close();
                e.stopPropagation();
            };

            // 切换到tab页
            scope.activeTab = function (tab) {
                uiTabs.active(tab);
            };

            // 右键菜单选中
            scope.menuSelect = function (tab, action) {

                switch (action) {
                    case 'refresh':
                        tab.refresh();
                        break;
                    case 'current':
                        tab.close();
                        break;
                    case 'left':
                        closeLeft(tab);
                        break;
                    case 'right':
                        closeRight(tab);
                        break;
                    case 'other':
                        closeLeft(tab);
                        closeRight(tab);
                        break;
                }
            };

            // 设置可拖动区域
            scope.opts = {
                containment: '.ui-tabs-nav'
            };

            /**
             * 关闭左侧标签
             * @param tab
             */
            function closeLeft(tab) {
                var closeIndex = 0,
                    closeTab;

                while ((closeTab = uiTabs.tabs[closeIndex]) !== tab) {
                    if (!closeTab.close()) {
                        // 关闭失败时，则关闭下一个
                        closeIndex++;
                    }
                }
            }

            /**
             * 关闭右侧标签
             * @param tab
             */
            function closeRight(tab) {
                var closeIndex = uiTabs.tabs.length - 1,
                    closeTab;

                while ((closeTab = uiTabs.tabs[closeIndex]) !== tab) {
                    closeTab.close();
                    closeIndex--;
                }
            }

            /**
             * 当tab打开时，加载动画
             *
             * @param e
             * @param tab
             */
            function tabOpenStarting(e, tab) {
                scope.current = uiTabs.current;
                tab.loading = true;
            }

            /**
             * 当tab成功打开时，建立生成tab页页面内容，并且加载controller
             *
             * @param e
             * @param tab
             * @param preTab
             */
            function tabOpenSuccess(e, tab, preTab) {
                var newScope, link, pageNode, container;

                tab.loading = false; // 取消加载动画

                newScope = tab.$scope = $rootScope.$new();
                newScope.$tab = tab;

                link = $compile(tab.locals['$template']);

                if (tab.controller) {
                    // 实例controller，并且传入uiTabsParams 和 uiTab 参数
                    $controller(tab.controller, angular.extend({
                        $scope: newScope,
                        uiTabsParams: tab.params || {},
                        uiTab: tab
                    }, tab.locals));
                }

                pageNode = tab.$node = link(newScope);

                // 等待tab容器生成
                $timeout(function () {
                    if (!newScope.$$destroyed) {
                        container = angular.element(element[0].querySelector('#ui-tabs-' + tab.id));
                        container.append(pageNode);

                        broadcastTabActivated(tab, preTab);
                    }
                });
            }

            /**
             * 当tab加载失败，则取消动画
             *
             * @param e
             * @param tab
             */
            function tabOpenError(e, tab) {
                tab.loading = false;
            }

            /**
             * 当tab切换成功，则变更当前的tab页
             */
            function tabChangeSuccess(e, tab, preTab) {
                scope.current = uiTabs.current;

                if (tab.reloadOnActive) {
                    if (tab.$scope) {
                        tab.$scope.$destroy();
                    }
                    if (tab.$node) {
                        tab.$node.remove();
                    }

                    tabOpenSuccess(e, tab, preTab);
                } else {
                    broadcastTabActivated(tab, preTab);
                }
            }

            /**
             * 只对该tab页广播 tabActivated 事件
             * @param tab 被打开的tab
             * @param preTab 前一个tab
             */
            function broadcastTabActivated(tab, preTab) {
                tab.$scope.$broadcast('tabActivated', preTab)
                //
                // $timeout(function () {
                //
                // });
            }

            /**
             * 当tab关闭时，销毁作用域，移除页面内容
             *
             * @param e
             * @param tab
             */
            function tabCloseSuccess(e, tab) {
                // 对于加载完毕的tab，则清除$scope, $node
                if (!tab.loading) {
                    tab.$scope.$destroy();
                    tab.$node.remove();
                }
            }

            /**
             * 刷新tab页
             *
             * @param e
             * @param tab
             */
            function tabRefresh(e, tab) {
                if (tab.$scope) {
                    tab.$scope.$destroy();
                }
                if (tab.$node) {
                    tab.$node.remove();
                }

                tabOpenSuccess(e, tab);
            }
        }
    };
});