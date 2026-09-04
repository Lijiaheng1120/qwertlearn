import Phaser from 'phaser'
import { getFrogStageRules, type FrogStageRules } from '../../core/challenge-progression'

interface Pad {
  shape: Phaser.GameObjects.Ellipse
  label: Phaser.GameObjects.Text
}

interface FrogCosmetics {
  frogSkin?: string
  lilyTheme?: string
}

const ROW_POSITIONS = [
  [{ x: 520, y: 360 }],
  [{ x: 330, y: 405 }, { x: 690, y: 245 }],
  [{ x: 260, y: 430 }, { x: 560, y: 310 }, { x: 760, y: 190 }],
  [{ x: 220, y: 440 }, { x: 470, y: 345 }, { x: 700, y: 250 }, { x: 820, y: 155 }],
] as const

export class FrogScene extends Phaser.Scene {
  private frog?: Phaser.GameObjects.Container
  private frogBody?: Phaser.GameObjects.Ellipse
  private frogEyes: Phaser.GameObjects.Arc[] = []
  private pads: Pad[] = []
  private targetIndex = 0
  private pendingWord = ''
  private stageRules: FrogStageRules = getFrogStageRules(1)
  private cosmetics: FrogCosmetics = {}
  private pendingJumpResolvers = new Set<() => void>()
  private readonly reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  constructor() {
    super('frog-scene')
  }

  create(): void {
    this.events.once('shutdown', () => this.cancelPendingActions())
    this.events.once('destroy', () => this.cancelPendingActions())
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#dff6ff')

    this.add.circle(width - 76, 72, 43, 0xffd96a)
    this.add.circle(width - 76, 72, 58, 0xffd96a, 0.18)
    this.add.ellipse(width * 0.2, height * 0.45, 450, 170, 0x8fd18a)
    this.add.ellipse(width * 0.72, height * 0.42, 590, 190, 0x9edc8a)
    this.add.rectangle(width / 2, height * 0.72, width, height * 0.58, 0x51afd0)
    this.add.ellipse(width * 0.48, height * 0.76, width * 1.2, height * 0.36, 0x65c3dc, 0.85)

    this.pads = Array.from({ length: 4 }, (_, index) => {
      const { x, y } = ROW_POSITIONS[3][index]
      const shape = this.add.ellipse(x, y, 150, 58, 0x4f9f57).setStrokeStyle(5, 0x3d8347)
      const label = this.add.text(x, y, '', {
        fontFamily: '-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5)
      return { shape, label }
    })

    this.frogBody = this.add.ellipse(0, 0, 72, 52, 0x69c66b).setStrokeStyle(4, 0x418b48)
    const leftEye = this.add.circle(-21, -25, 17, 0x76d377).setStrokeStyle(4, 0x418b48)
    const rightEye = this.add.circle(21, -25, 17, 0x76d377).setStrokeStyle(4, 0x418b48)
    this.frogEyes = [leftEye, rightEye]
    const leftPupil = this.add.circle(-21, -25, 7, 0xffffff)
    const rightPupil = this.add.circle(21, -25, 7, 0xffffff)
    const leftDot = this.add.circle(-21, -25, 3, 0x17353b)
    const rightDot = this.add.circle(21, -25, 3, 0x17353b)
    const smile = this.add.arc(0, 2, 16, 15, 165, false, 0, 0).setStrokeStyle(3, 0x285f37)
    this.frog = this.add.container(78, height - 58, [this.frogBody, leftEye, rightEye, leftPupil, rightPupil, leftDot, rightDot, smile])

    this.add.text(28, 25, '每 8 词升级，生命耗尽前可以一直跳', {
      fontFamily: '-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#17353b',
      backgroundColor: '#fffdf4dd',
      padding: { x: 14, y: 10 },
    })
    this.configureStage(this.stageRules)
    this.applyRewards(this.cosmetics)
    this.setTarget(this.pendingWord || 'cat')
  }

  configureStage(rules: FrogStageRules): void {
    this.stageRules = rules
    if (this.pads.length === 0) return
    const positions = ROW_POSITIONS[rules.lilyRows - 1]
    this.targetIndex %= rules.lilyRows

    this.pads.forEach((pad, index) => {
      this.tweens.killTweensOf([pad.shape, pad.label])
      const position = positions[index]
      const visible = index < rules.lilyRows && Boolean(position)
      pad.shape.setVisible(visible).setActive(visible)
      pad.label.setVisible(visible).setActive(visible)
      if (!position) return
      pad.shape.setPosition(position.x, position.y)
      pad.label.setPosition(position.x, position.y)
      if (this.reducedMotion) return
      const travel = Math.min(150, 55 + rules.movementMultiplier * 22)
      const direction = rules.reverseRows && index % 2 === 1 ? -1 : 1
      this.tweens.add({
        targets: [pad.shape, pad.label],
        x: position.x + travel * direction,
        duration: Math.max(1_050, 3_600 / rules.movementMultiplier),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: index * 140,
      })
    })
    this.setTarget(this.pendingWord || 'cat')
  }

  applyRewards(cosmetics: FrogCosmetics): void {
    this.cosmetics = cosmetics
    const starlight = cosmetics.frogSkin === 'frog-starlight'
    const emerald = cosmetics.lilyTheme === 'lily-emerald'
    this.frogBody?.setFillStyle(starlight ? 0x8e74d6 : 0x69c66b)
      .setStrokeStyle(4, starlight ? 0x5b469e : 0x418b48)
    this.frogEyes.forEach((eye) => eye.setFillStyle(starlight ? 0xa88ce9 : 0x76d377)
      .setStrokeStyle(4, starlight ? 0x5b469e : 0x418b48))
    this.pads.forEach((pad) => pad.shape.setFillStyle(emerald ? 0x2f9d79 : 0x4f9f57))
    this.setTarget(this.pendingWord || 'cat')
  }

  showStageBanner(stageLevel: number): void {
    if (!this.sys.isActive()) return
    const banner = this.add.text(this.scale.width / 2, 92, `阶段 ${stageLevel} · 继续跳！`, {
      fontFamily: '-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif',
      fontSize: '31px',
      fontStyle: 'bold',
      color: '#17353b',
      backgroundColor: '#ffd96af2',
      padding: { x: 24, y: 13 },
    }).setOrigin(0.5).setDepth(20)
    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: 70,
      delay: this.reducedMotion ? 500 : 900,
      duration: this.reducedMotion ? 1 : 350,
      onComplete: () => banner.destroy(),
    })
  }

  setTarget(word: string): void {
    this.pendingWord = word
    if (this.pads.length === 0) return
    const emerald = this.cosmetics.lilyTheme === 'lily-emerald'
    this.pads.forEach((pad, index) => {
      const active = index === this.targetIndex && index < this.stageRules.lilyRows
      pad.label.setText(active ? word : '')
      pad.shape.setFillStyle(active ? (emerald ? 0x3bbf8f : 0x65bd67) : (emerald ? 0x2f9d79 : 0x4f9f57))
      pad.shape.setStrokeStyle(active ? 7 : 4, active ? 0xfff2a8 : (emerald ? 0x23765e : 0x3d8347))
    })
  }

  jumpToNext(nextWord: string): Promise<void> {
    if (!this.frog) return Promise.resolve()
    const target = this.pads[this.targetIndex]

    return new Promise((resolve) => {
      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        this.pendingJumpResolvers.delete(settle)
        resolve()
      }
      this.pendingJumpResolvers.add(settle)

      this.tweens.add({
        targets: this.frog,
        x: target.shape.x,
        y: target.shape.y - 38,
        duration: this.reducedMotion ? 1 : 470,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!this.sys.isActive()) {
            settle()
            return
          }
          target.label.setText('✓')
          this.targetIndex += 1
          if (this.targetIndex >= this.stageRules.lilyRows) {
            if (!this.reducedMotion) this.cameras.main.flash(240, 255, 245, 175)
            this.targetIndex = 0
            this.frog?.setPosition(78, this.scale.height - 58)
          }
          this.setTarget(nextWord)
          settle()
        },
      })
    })
  }

  cancelPendingActions(): void {
    this.tweens?.killAll()
    const pending = [...this.pendingJumpResolvers]
    this.pendingJumpResolvers.clear()
    pending.forEach((resolve) => resolve())
  }

  showMistake(): void {
    if (!this.frog) return
    this.tweens.add({ targets: this.frog, x: '+=8', duration: this.reducedMotion ? 1 : 45, yoyo: true, repeat: 2 })
  }

  showRescue(word: string): void {
    if (!this.reducedMotion) this.cameras.main.shake(160, 0.006)
    this.setTarget(word)
  }

  resetRun(word: string): void {
    this.targetIndex = 0
    this.frog?.setPosition(78, this.scale.height - 58).setAlpha(1)
    this.pads.forEach((pad) => pad.label.setText(''))
    this.configureStage(this.stageRules)
    this.setTarget(word)
  }
}
