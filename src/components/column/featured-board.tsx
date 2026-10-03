import type { SourceID } from "@shared/types"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useWindowSize } from "react-use"
import { CardWrapper } from "./card"

const ROTATE_INTERVAL = 8000
const FEATURED_SOURCE = "gxddc" as SourceID

type RotatingItem =
  | { kind: "promo", key: PromoKey }
  | { kind: "source", key: SourceID, id: SourceID }

type PromoKey = "kuaizhunyi" | "xiaodushe" | "qianqiuhuisheng"

export function FeaturedBoard({ items }: { items: SourceID[] }) {
  const { width } = useWindowSize()
  const isCompact = width < 768
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [showSubscription, setShowSubscription] = useState(false)

  const rotatingItems = useMemo<RotatingItem[]>(() => [
    { kind: "promo", key: "kuaizhunyi" },
    { kind: "promo", key: "xiaodushe" },
    { kind: "promo", key: "qianqiuhuisheng" },
    ...items
      .filter(id => id !== FEATURED_SOURCE)
      .map(id => ({ kind: "source" as const, key: id, id })),
  ], [items])

  const itemCount = rotatingItems.length
  const move = useCallback((direction: number) => {
    setActiveIndex(current => itemCount ? (current + direction + itemCount) % itemCount : 0)
  }, [itemCount])

  useEffect(() => {
    if (paused || reduceMotion || itemCount < 2) return
    const timer = window.setInterval(() => move(1), ROTATE_INTERVAL)
    return () => window.clearInterval(timer)
  }, [itemCount, move, paused, reduceMotion])

  useEffect(() => {
    if (activeIndex >= itemCount) setActiveIndex(0)
  }, [activeIndex, itemCount])

  if (!items.includes(FEATURED_SOURCE)) return null

  const left = rotatingItems[activeIndex]
  const right = rotatingItems[(activeIndex + 1) % itemCount]
  const onBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
  }

  return (
    <section
      className="featured-board"
      aria-label="共享两轮车资讯精选"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={onBlur}
    >
      <div className="featured-board__intro">
        <span>中心主频道固定</span>
        <span aria-hidden="true">·</span>
        <span>{isCompact ? "下方卡片轮换" : "左右卡片轮换抽取"}</span>
        <button type="button" onClick={() => setShowSubscription(true)}>
          <span className="i-ph:bell-ringing-duotone" aria-hidden="true" />
          微信每日订阅
        </button>
      </div>

      {isCompact
        ? (
            <div className="featured-board__mobile">
              <FeaturedCard />
              <RotationControls
                activeIndex={activeIndex}
                itemCount={itemCount}
                paused={paused || Boolean(reduceMotion)}
                onPrevious={() => move(-1)}
                onNext={() => move(1)}
              />
              <RotatingCard item={left} direction={1} reduceMotion={Boolean(reduceMotion)} />
            </div>
          )
        : (
            <>
              <div className="featured-board__grid">
                <RotatingCard item={left} direction={-1} reduceMotion={Boolean(reduceMotion)} />
                <FeaturedCard />
                <RotatingCard item={right} direction={1} reduceMotion={Boolean(reduceMotion)} />
              </div>
              <RotationControls
                activeIndex={activeIndex}
                itemCount={itemCount}
                paused={paused || Boolean(reduceMotion)}
                onPrevious={() => move(-1)}
                onNext={() => move(1)}
              />
            </>
          )}

      {showSubscription && <SubscriptionDialog onClose={() => setShowSubscription(false)} />}
    </section>
  )
}

function SubscriptionDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="subscription-dialog__backdrop" onMouseDown={onClose}>
      <div
        className="subscription-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-dialog-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <button type="button" className="subscription-dialog__close" aria-label="关闭订阅说明" onClick={onClose}>×</button>
        <span className="subscription-dialog__eyebrow">快准易 · 微信订阅消息</span>
        <h2 id="subscription-dialog-title">订阅共享两轮每日资讯</h2>
        <div className="subscription-dialog__content">
          <img src="/kuaizhunyi-qr.jpg" alt="快准易微信小程序码" width="176" height="176" />
          <ol>
            <li>微信扫码打开快准易小程序</li>
            <li>进入「产业早报」并点击订阅每日提醒</li>
            <li>完成微信授权后，每日自动接收资讯摘要</li>
          </ol>
        </div>
        <p>已接入快准易生产环境的「产业早报提醒」正式订阅模板。</p>
      </div>
    </div>
  )
}

function FeaturedCard() {
  return (
    <div className="featured-board__featured">
      <span className="featured-board__badge">固定主频道</span>
      <CardWrapper id={FEATURED_SOURCE} />
    </div>
  )
}

function RotatingCard({ item, direction, reduceMotion }: {
  item: RotatingItem | undefined
  direction: -1 | 1
  reduceMotion: boolean
}) {
  if (!item) return null
  return (
    <div className="featured-board__deck">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          className="featured-board__rotating-card"
          key={item.key}
          initial={reduceMotion ? false : { opacity: 0, x: direction * 28, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: direction * -20, scale: 0.97 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
        >
          {item.kind === "promo" ? <PromoCard promo={item.key} /> : <CardWrapper id={item.id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function PromoCard({ promo }: { promo: PromoKey }) {
  if (promo === "xiaodushe") return <XiaodushePromo />
  if (promo === "qianqiuhuisheng") return <QianqiuHuishengPromo />
  return <KuaizhunyiPromo />
}

function RotationControls({ activeIndex, itemCount, paused, onPrevious, onNext }: {
  activeIndex: number
  itemCount: number
  paused: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="featured-board__controls" aria-label="轮换卡片控制">
      <span>{paused ? "自动轮换已暂停" : "每 8 秒自动轮换"}</span>
      <div>
        <button type="button" aria-label="上一张轮换卡片" onClick={onPrevious}>‹</button>
        <span aria-live="polite">
          {itemCount ? activeIndex + 1 : 0}
          {" / "}
          {itemCount}
        </span>
        <button type="button" aria-label="下一张轮换卡片" onClick={onNext}>›</button>
      </div>
    </div>
  )
}

function KuaizhunyiPromo() {
  return (
    <article className="kuaizhunyi-promo" aria-label="快准易合作推广">
      <div className="kuaizhunyi-promo__brand">
        <img src="/kuaizhunyi-logo.svg" alt="" width="48" height="48" />
        <div>
          <span className="kuaizhunyi-promo__eyebrow">合作 · 行业工具</span>
          <h2>快准易</h2>
          <p>共享两轮一站式服务平台</p>
        </div>
      </div>
      <div className="kuaizhunyi-promo__content">
        <ul>
          <li>政策与城市准入</li>
          <li>招投标与项目机会</li>
          <li>车辆电池合规</li>
          <li>运维口碑与客诉趋势</li>
        </ul>
        <div className="kuaizhunyi-promo__qr">
          <img
            src="/kuaizhunyi-qr.jpg"
            alt="快准易微信小程序码"
            width="112"
            height="112"
            loading="lazy"
          />
          <span>微信扫码打开快准易</span>
        </div>
      </div>
      <div className="kuaizhunyi-promo__footer">
        <a href="https://app1.kuaizhunyi.com.cn/" target="_blank" rel="noopener noreferrer">
          了解快准易
          <span aria-hidden="true">→</span>
        </a>
        <span>全国共享两轮产业服务</span>
      </div>
    </article>
  )
}

function XiaodushePromo() {
  return (
    <article className="brand-promo xiaodushe-promo" aria-label="小毒舌记账产品推荐">
      <div className="brand-promo__brand">
        <img src="/xiaodushe-logo.svg" alt="" width="58" height="58" />
        <div>
          <span className="brand-promo__eyebrow">生活工具 · AI 记账</span>
          <h2>小毒舌记账</h2>
          <p>快乐中看清消费</p>
        </div>
      </div>
      <div className="xiaodushe-promo__body">
        <div>
          <div className="brand-promo__statement">
            <strong>会吐槽，也会在你需要时温柔一点。</strong>
            <span>面向个人、情侣与家庭的轻松记账工具。</span>
          </div>
          <ul className="brand-promo__chips" aria-label="小毒舌记账功能">
            <li>语音记账</li>
            <li>图片识别</li>
            <li>共享账本</li>
            <li>消费分析</li>
          </ul>
        </div>
        <div className="xiaodushe-promo__qr">
          <img src="/xiaodushe-qr.jpg" alt="小毒舌记账微信小程序码" width="126" height="126" />
          <span>微信扫码打开小程序</span>
        </div>
      </div>
      <div className="brand-promo__footer">
        <span className="xiaodushe-promo__entry">微信小程序 · 小毒舌记账</span>
        <span>AI 轻松点评</span>
      </div>
    </article>
  )
}

function QianqiuHuishengPromo() {
  return (
    <article className="brand-promo qianqiu-promo" aria-label="新东方女性百科全书：千秋回声说人物">
      <div>
        <span className="brand-promo__eyebrow">女性人物志 · 持续更新</span>
        <h2>新东方女性百科全书</h2>
        <p className="qianqiu-promo__name">千秋回声 · 说人物</p>
      </div>
      <div className="qianqiu-promo__body">
        <blockquote>
          “以人物照见时代，
          <br />
          以女性经验补全历史的回声。”
        </blockquote>
        <div className="qianqiu-promo__qr">
          <img src="/qianqiu-huisheng-qr.jpg" alt="千秋回声说人物二维码" width="126" height="126" />
          <span>扫码阅读千秋回声</span>
        </div>
      </div>
      <div className="qianqiu-promo__topics" aria-label="内容方向">
        <span>人物</span>
        <span>史料</span>
        <span>选择</span>
        <span>时代</span>
      </div>
      <div className="brand-promo__footer">
        <span>人物百科专题</span>
        <span>东方既白 · 内容推荐</span>
      </div>
    </article>
  )
}
