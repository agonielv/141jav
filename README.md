# 141jav - JavDB 全页按评分排序脚本

这是一个 Tampermonkey/Greasemonkey 用户脚本，用于在 JavDB 常见影片列表页中，把**所有分页**的番号卡片抓取后统一按评分从高到低排序。

## 支持页面

- `https://javdb.com/users/list_detail?id=<清单ID>`
- `https://javdb.com/lists/<清单ID>`
- `https://javdb.com/search?f=playable&q=<番号系列ID>`
- `https://javdb.com/directors/<导演ID>`
- `https://javdb.com/makers/<片商ID>?f=download`
- `https://javdb.com/series/<系列ID>`

## 使用方法

1. 安装浏览器扩展（Tampermonkey 或 Violentmonkey）。
2. 新建脚本，把 `javdb-list-sort-by-rating.user.js` 内容粘贴进去并保存。
3. 打开以上任意支持页面。
4. 点击右下角 **全页按评分排序** 按钮。

## 说明

- 脚本会从第 1 页开始连续抓取分页，直到检测到最后一页，不依赖当前可见页码按钮数量。
- 排序是前端重排，不会改动网站上的原始数据。
- 默认按评分降序排列，评分相同按原始顺序展示。
- 按钮会显示抓取进度与排序结果数量。
