# 141jav - JavDB 清单按评分排序脚本

这是一个 Tampermonkey/Greasemonkey 用户脚本，用于在以下页面中把番号卡片按评分从高到低重新排序：

- `https://javdb.com/users/list_detail?id=<清单ID>`

## 使用方法

1. 安装浏览器扩展（Tampermonkey 或 Violentmonkey）。
2. 新建脚本，把 `javdb-list-sort-by-rating.user.js` 内容粘贴进去并保存。
3. 打开任意清单详情页。
4. 点击右下角 **按评分排序** 按钮。

## 说明

- 排序是前端重排，不会改动你在网站上的原始清单数据。
- 默认按评分降序排列，评分相同保持原始顺序。
- 若页面评分样式变更，可能需要调整脚本中的评分提取选择器。
