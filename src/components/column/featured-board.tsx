export const productPromoKeys = ["kuaizhunyi", "xiaodushe", "qianqiuhuisheng"] as const

export type ProductPromoKey = typeof productPromoKeys[number]

const promoConfig = {
  kuaizhunyi: {
    name: "快准易",
    description: "共享两轮一站式服务平台",
    label: "行业工具",
    logo: "/kuaizhunyi-logo.svg",
    qr: "/kuaizhunyi-qr.jpg",
    qrAlt: "快准易微信小程序码",
    note: "扫码查看产业早报并订阅每日提醒",
    points: ["政策与城市准入", "招投标与项目机会", "车辆电池合规", "运维口碑与客诉趋势"],
    shell: "bg-orange-500 dark:bg-orange-900 bg-op-40!",
    accent: "text-orange-600 dark:text-orange-300",
    href: "https://app1.kuaizhunyi.com.cn/",
  },
  xiaodushe: {
    name: "小毒舌记账",
    description: "快乐中看清消费",
    label: "AI 记账",
    logo: "/xiaodushe-logo.svg",
    qr: "/xiaodushe-qr.jpg",
    qrAlt: "小毒舌记账微信小程序码",
    note: "微信扫码打开小毒舌记账",
    points: ["语音记账", "图片识别", "共享账本", "消费分析"],
    shell: "bg-blue-500 dark:bg-blue-900 bg-op-40!",
    accent: "text-blue-600 dark:text-blue-300",
  },
  qianqiuhuisheng: {
    name: "千秋回声说人物",
    description: "新东方女性百科全书",
    label: "人物百科",
    qr: "/qianqiu-huisheng-qr.jpg",
    qrAlt: "千秋回声说人物二维码",
    note: "扫码阅读千秋回声人物专题",
    points: ["人物", "史料", "选择", "时代"],
    shell: "bg-amber-500 dark:bg-amber-900 bg-op-40!",
    accent: "text-amber-700 dark:text-amber-300",
  },
} as const

export function ProductPromoCard({ promo }: { promo: ProductPromoKey }) {
  const config = promoConfig[promo]
  const logo = "logo" in config ? config.logo : undefined
  const content = (
    <>
      <div className="flex justify-between mx-2 mt-0 mb-2 items-center">
        <div className="flex gap-2 items-center min-w-0">
          {logo
            ? <img src={logo} alt="" width="32" height="32" className="w-8 h-8 rounded-full object-cover bg-white" />
            : (
                <span className={$("w-8 h-8 rounded-full grid place-items-center bg-base bg-op-70! font-serif font-bold", config.accent)}>
                  千
                </span>
              )}
          <span className="flex flex-col min-w-0">
            <span className="text-xl font-bold truncate">{config.name}</span>
            <span className="text-xs op-70 truncate">{config.description}</span>
          </span>
        </div>
        <span className={$("text-xs px-2 py-1 rounded bg-base bg-op-60!", config.accent)}>
          {config.label}
        </span>
      </div>

      <div className="h-full p-4 overflow-hidden rounded-2xl bg-base bg-op-70!">
        <div className="h-full flex flex-col items-center justify-between gap-3 text-center">
          <div>
            <p className="text-sm op-70">合作推广</p>
            <h2 className="mt-1 text-lg font-bold">{config.description}</h2>
          </div>
          <img
            src={config.qr}
            alt={config.qrAlt}
            width="156"
            height="156"
            loading="lazy"
            className="w-39 h-39 rounded-xl bg-white p-1 object-contain"
          />
          <p className="text-sm">{config.note}</p>
          <ul className="flex flex-wrap justify-center gap-2 text-xs op-75" aria-label={`${config.name}特点`}>
            {config.points.map(point => (
              <li key={point} className="px-2 py-1 rounded bg-neutral-400/10">{point}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )

  return (
    <article className={$("flex flex-col h-500px rounded-2xl p-4 cursor-default", config.shell)}>
      {"href" in config
        ? (
            <a href={config.href} target="_blank" rel="noopener noreferrer" className="h-full flex flex-col text-inherit">
              {content}
            </a>
          )
        : content}
    </article>
  )
}
