import { isRelevantMobilityTitle } from "../server/sources/gxddc"

describe("shared mobility title filtering", () => {
  it.each([
    "共享单车服务规范新国标发布",
    "公共自行车项目采购公告",
    "电动自行车电池合规专项检查",
    "两轮车换电标准公开征求意见",
    "共享电单车还车失败投诉增加",
    "城市新增换电柜便民服务点",
  ])("keeps relevant title: %s", (title) => {
    expect(isRelevantMobilityTitle(title)).toBe(true)
  })

  it.each([
    "单车亏20万的大众辉腾",
    "展会现场这款单车很划算",
    "城市准入改革取得新进展",
    "电子围栏技术应用于物流园",
  ])("drops unrelated title: %s", (title) => {
    expect(isRelevantMobilityTitle(title)).toBe(false)
  })
})
