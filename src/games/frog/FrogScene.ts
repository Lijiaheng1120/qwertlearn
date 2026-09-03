import Phaser from 'phaser'

interface Pad {
  shape: Phaser.GameObjects.Ellipse
  label: Phaser.GameObjects.Text
  x: number
  y: number
}

export class FrogScene extends Phaser.Scene {
  private frog?: Phaser.GameObjects.Container
  private pads: Pad[] = []
  private targetIndex = 0
  private pendingWord = ''
  private pendingJumpResolvers = new Set<() => void>()

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

    const positions = [
      { x: 200, y: 430 },
      { x: 410, y: 330 },
      { x: 635, y: 235 },
      { x: 830, y: 142 },
    ]

    this.pads = positions.map(({ x, y }, index) => {
      const shape = this.add.ellipse(x, y, 150, 58, index === 0 ? 0x65bd67 : 0x4f9f57)
        .setStrokeStyle(5, 0x3d8347)
      const label = this.add.text(x, y, '', {
        fontFamily: '-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif',
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5)
      return { shape, label, x, y }
    })

    const body = this.add.ellipse(0, 0, 72, 52, 0x69c66b).setStrokeStyle(4, 0x418b48)
    const leftEye = this.add.circle(-21, -25, 17, 0x76d377).setStrokeStyle(4, 0x418b48)
    const rightEye = this.add.circle(21, -25, 17, 0x76d377).setStrokeStyle(4, 0x418b48)
    const leftPupil = this.add.circle(-21, -25, 7, 0xffffff)
    const rightPupil = this.add.circle(21, -25, 7, 0xffffff)
    const leftDot = this.add.circle(-21, -25, 3, 0x17353b)
    const rightDot = this.add.circle(21, -25, 3, 0x17353b)
    const smile = this.add.arc(0, 2, 16, 15, 165, false, 0, 0).setStrokeStyle(3, 0x285f37)
    this.frog = this.add.container(78, height - 58, [body, leftEye, rightEye, leftPupil, rightPupil, leftDot, rightDot, smile])

    this.add.text(28, 25, '打对单词，跳到发光的荷叶', {
      fontFamily: '-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#17353b',
      backgroundColor: '#fffdf4dd',
      padding: { x: 14, y: 10 },
    })
    this.setTarget(this.pendingWord || 'cat')
  }

  setTarget(word: string): void {
    this.pendingWord = word
    if (this.pads.length === 0) return
    this.pads.forEach((pad, index) => {
      const active = index === this.targetIndex
      pad.label.setText(active ? word : '')
      pad.shape.setFillStyle(active ? 0x65bd67 : 0x4f9f57)
      pad.shape.setStrokeStyle(active ? 7 : 4, active ? 0xfff2a8 : 0x3d8347)
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
        x: target.x,
        y: target.y - 38,
        duration: 470,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!this.sys.isActive()) {
            settle()
            return
          }
          target.label.setText('✓')
          this.targetIndex += 1
          if (this.targetIndex >= this.pads.length) {
            this.cameras.main.flash(240, 255, 245, 175)
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
    this.tweens.add({ targets: this.frog, x: '+=8', duration: 45, yoyo: true, repeat: 2 })
  }

  showRescue(word: string): void {
    this.cameras.main.shake(160, 0.006)
    this.setTarget(word)
  }

  resetRun(word: string): void {
    this.targetIndex = 0
    this.frog?.setPosition(78, this.scale.height - 58).setAlpha(1)
    this.pads.forEach((pad) => pad.label.setText(''))
    this.setTarget(word)
  }
}
