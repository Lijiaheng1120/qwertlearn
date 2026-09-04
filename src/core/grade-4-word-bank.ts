import type { WordEntry } from './models'

export const GRADE_4_WORD_PACK_ID = 'fltrp-grade4-v1'
export const GRADE_4_WORD_PACK_NAME = '外研版四年级扩展词库'
export const GRADE_4_WORD_PACK_VERSION = '1.0.0'
export const WORD_SESSION_BATCH_SIZE = 24

type Grade4WordSeed = Pick<WordEntry, 'id' | 'text' | 'meaning' | 'unit' | 'difficulty' | 'tags'>

function grade4Word(seed: Grade4WordSeed): WordEntry {
  return {
    ...seed,
    grade: 4,
    tags: [...seed.tags, 'grade-4', 'fltrp-aligned'],
  }
}

const GRADE_4_WORD_SEEDS: Grade4WordSeed[] = [
  // 动物与自然（28）
  { id: 'exp-cat', text: 'cat', meaning: '猫', unit: '动物与自然', difficulty: 1, tags: ['animal', 'short'] },
  { id: 'exp-frog', text: 'frog', meaning: '青蛙', unit: '动物与自然', difficulty: 1, tags: ['animal'] },
  { id: 'exp-river', text: 'river', meaning: '河流', unit: '动物与自然', difficulty: 2, tags: ['nature'] },
  { id: 'g4-dog', text: 'dog', meaning: '狗', unit: '动物与自然', difficulty: 1, tags: ['animal', 'short'] },
  { id: 'g4-bird', text: 'bird', meaning: '鸟', unit: '动物与自然', difficulty: 1, tags: ['animal'] },
  { id: 'g4-fish', text: 'fish', meaning: '鱼', unit: '动物与自然', difficulty: 1, tags: ['animal'] },
  { id: 'g4-duck', text: 'duck', meaning: '鸭子', unit: '动物与自然', difficulty: 1, tags: ['animal'] },
  { id: 'g4-rabbit', text: 'rabbit', meaning: '兔子', unit: '动物与自然', difficulty: 2, tags: ['animal'] },
  { id: 'g4-panda', text: 'panda', meaning: '熊猫', unit: '动物与自然', difficulty: 2, tags: ['animal'] },
  { id: 'g4-tiger', text: 'tiger', meaning: '老虎', unit: '动物与自然', difficulty: 2, tags: ['animal'] },
  { id: 'g4-lion', text: 'lion', meaning: '狮子', unit: '动物与自然', difficulty: 1, tags: ['animal'] },
  { id: 'g4-monkey', text: 'monkey', meaning: '猴子', unit: '动物与自然', difficulty: 2, tags: ['animal'] },
  { id: 'g4-elephant', text: 'elephant', meaning: '大象', unit: '动物与自然', difficulty: 3, tags: ['animal', 'long'] },
  { id: 'g4-horse', text: 'horse', meaning: '马', unit: '动物与自然', difficulty: 2, tags: ['animal'] },
  { id: 'g4-cow', text: 'cow', meaning: '奶牛', unit: '动物与自然', difficulty: 1, tags: ['animal', 'short'] },
  { id: 'g4-sheep', text: 'sheep', meaning: '绵羊', unit: '动物与自然', difficulty: 2, tags: ['animal'] },
  { id: 'g4-animal', text: 'animal', meaning: '动物', unit: '动物与自然', difficulty: 2, tags: ['animal'] },
  { id: 'g4-tree', text: 'tree', meaning: '树', unit: '动物与自然', difficulty: 1, tags: ['nature'] },
  { id: 'g4-flower', text: 'flower', meaning: '花朵', unit: '动物与自然', difficulty: 2, tags: ['nature'] },
  { id: 'g4-grass', text: 'grass', meaning: '草地', unit: '动物与自然', difficulty: 2, tags: ['nature'] },
  { id: 'g4-mountain', text: 'mountain', meaning: '高山', unit: '动物与自然', difficulty: 3, tags: ['nature', 'long'] },
  { id: 'g4-lake', text: 'lake', meaning: '湖泊', unit: '动物与自然', difficulty: 1, tags: ['nature'] },
  { id: 'g4-sea', text: 'sea', meaning: '大海', unit: '动物与自然', difficulty: 1, tags: ['nature', 'short'] },
  { id: 'g4-sky', text: 'sky', meaning: '天空', unit: '动物与自然', difficulty: 1, tags: ['nature', 'short'] },
  { id: 'g4-sun', text: 'sun', meaning: '太阳', unit: '动物与自然', difficulty: 1, tags: ['nature', 'short'] },
  { id: 'g4-moon', text: 'moon', meaning: '月亮', unit: '动物与自然', difficulty: 1, tags: ['nature'] },
  { id: 'g4-star', text: 'star', meaning: '星星', unit: '动物与自然', difficulty: 1, tags: ['nature'] },
  { id: 'g4-forest', text: 'forest', meaning: '森林', unit: '动物与自然', difficulty: 2, tags: ['nature'] },

  // 学校生活（24）
  { id: 'exp-book', text: 'book', meaning: '书本', unit: '学校生活', difficulty: 1, tags: ['school'] },
  { id: 'exp-school', text: 'school', meaning: '学校', unit: '学校生活', difficulty: 2, tags: ['school'] },
  { id: 'exp-teacher', text: 'teacher', meaning: '老师', unit: '学校生活', difficulty: 3, tags: ['people', 'school'] },
  { id: 'g4-student', text: 'student', meaning: '学生', unit: '学校生活', difficulty: 3, tags: ['people', 'school'] },
  { id: 'g4-classroom', text: 'classroom', meaning: '教室', unit: '学校生活', difficulty: 4, tags: ['school', 'long'] },
  { id: 'g4-desk', text: 'desk', meaning: '书桌', unit: '学校生活', difficulty: 1, tags: ['school'] },
  { id: 'g4-chair', text: 'chair', meaning: '椅子', unit: '学校生活', difficulty: 2, tags: ['school'] },
  { id: 'g4-pencil', text: 'pencil', meaning: '铅笔', unit: '学校生活', difficulty: 2, tags: ['school'] },
  { id: 'g4-ruler', text: 'ruler', meaning: '直尺', unit: '学校生活', difficulty: 2, tags: ['school'] },
  { id: 'g4-eraser', text: 'eraser', meaning: '橡皮', unit: '学校生活', difficulty: 2, tags: ['school'] },
  { id: 'g4-bag', text: 'bag', meaning: '书包', unit: '学校生活', difficulty: 1, tags: ['school', 'short'] },
  { id: 'g4-notebook', text: 'notebook', meaning: '笔记本', unit: '学校生活', difficulty: 3, tags: ['school', 'long'] },
  { id: 'g4-homework', text: 'homework', meaning: '家庭作业', unit: '学校生活', difficulty: 3, tags: ['school', 'long'] },
  { id: 'g4-lesson', text: 'lesson', meaning: '课程', unit: '学校生活', difficulty: 2, tags: ['school'] },
  { id: 'g4-subject', text: 'subject', meaning: '学科', unit: '学校生活', difficulty: 3, tags: ['school'] },
  { id: 'g4-english', text: 'english', meaning: '英语', unit: '学校生活', difficulty: 3, tags: ['school', 'language'] },
  { id: 'g4-chinese', text: 'chinese', meaning: '中文', unit: '学校生活', difficulty: 3, tags: ['school', 'language'] },
  { id: 'g4-maths', text: 'maths', meaning: '数学', unit: '学校生活', difficulty: 2, tags: ['school'] },
  { id: 'g4-science', text: 'science', meaning: '科学', unit: '学校生活', difficulty: 3, tags: ['school'] },
  { id: 'g4-music', text: 'music', meaning: '音乐', unit: '学校生活', difficulty: 2, tags: ['school'] },
  { id: 'g4-art', text: 'art', meaning: '美术', unit: '学校生活', difficulty: 1, tags: ['school', 'short'] },
  { id: 'g4-computer', text: 'computer', meaning: '电脑', unit: '学校生活', difficulty: 3, tags: ['school', 'technology'] },
  { id: 'g4-library', text: 'library', meaning: '图书馆', unit: '学校生活', difficulty: 3, tags: ['school', 'place'] },
  { id: 'g4-playground', text: 'playground', meaning: '操场', unit: '学校生活', difficulty: 5, tags: ['school', 'place', 'long'] },

  // 家庭与人物（17）
  { id: 'exp-friend', text: 'friend', meaning: '朋友', unit: '家庭与人物', difficulty: 2, tags: ['people'] },
  { id: 'g4-family', text: 'family', meaning: '家庭', unit: '家庭与人物', difficulty: 2, tags: ['family'] },
  { id: 'g4-father', text: 'father', meaning: '父亲', unit: '家庭与人物', difficulty: 2, tags: ['family'] },
  { id: 'g4-mother', text: 'mother', meaning: '母亲', unit: '家庭与人物', difficulty: 2, tags: ['family'] },
  { id: 'g4-parent', text: 'parent', meaning: '家长', unit: '家庭与人物', difficulty: 2, tags: ['family'] },
  { id: 'g4-brother', text: 'brother', meaning: '兄弟', unit: '家庭与人物', difficulty: 3, tags: ['family'] },
  { id: 'g4-sister', text: 'sister', meaning: '姐妹', unit: '家庭与人物', difficulty: 2, tags: ['family'] },
  { id: 'g4-baby', text: 'baby', meaning: '婴儿', unit: '家庭与人物', difficulty: 1, tags: ['family'] },
  { id: 'g4-grandpa', text: 'grandpa', meaning: '爷爷或外公', unit: '家庭与人物', difficulty: 3, tags: ['family'] },
  { id: 'g4-grandma', text: 'grandma', meaning: '奶奶或外婆', unit: '家庭与人物', difficulty: 3, tags: ['family'] },
  { id: 'g4-uncle', text: 'uncle', meaning: '叔叔', unit: '家庭与人物', difficulty: 2, tags: ['family'] },
  { id: 'g4-aunt', text: 'aunt', meaning: '阿姨', unit: '家庭与人物', difficulty: 1, tags: ['family'] },
  { id: 'g4-cousin', text: 'cousin', meaning: '堂表兄弟姐妹', unit: '家庭与人物', difficulty: 2, tags: ['family'] },
  { id: 'g4-boy', text: 'boy', meaning: '男孩', unit: '家庭与人物', difficulty: 1, tags: ['people', 'short'] },
  { id: 'g4-girl', text: 'girl', meaning: '女孩', unit: '家庭与人物', difficulty: 1, tags: ['people'] },
  { id: 'g4-child', text: 'child', meaning: '孩子', unit: '家庭与人物', difficulty: 2, tags: ['people'] },
  { id: 'g4-people', text: 'people', meaning: '人们', unit: '家庭与人物', difficulty: 2, tags: ['people'] },

  // 家居生活（19）
  { id: 'exp-window', text: 'window', meaning: '窗户', unit: '家居生活', difficulty: 2, tags: ['home'] },
  { id: 'g4-home', text: 'home', meaning: '家', unit: '家居生活', difficulty: 1, tags: ['home'] },
  { id: 'g4-house', text: 'house', meaning: '房屋', unit: '家居生活', difficulty: 2, tags: ['home'] },
  { id: 'g4-room', text: 'room', meaning: '房间', unit: '家居生活', difficulty: 1, tags: ['home'] },
  { id: 'g4-bedroom', text: 'bedroom', meaning: '卧室', unit: '家居生活', difficulty: 3, tags: ['home', 'long'] },
  { id: 'g4-bathroom', text: 'bathroom', meaning: '浴室', unit: '家居生活', difficulty: 3, tags: ['home', 'long'] },
  { id: 'g4-kitchen', text: 'kitchen', meaning: '厨房', unit: '家居生活', difficulty: 3, tags: ['home'] },
  { id: 'g4-sofa', text: 'sofa', meaning: '沙发', unit: '家居生活', difficulty: 1, tags: ['home'] },
  { id: 'g4-bed', text: 'bed', meaning: '床', unit: '家居生活', difficulty: 1, tags: ['home', 'short'] },
  { id: 'g4-door', text: 'door', meaning: '门', unit: '家居生活', difficulty: 1, tags: ['home'] },
  { id: 'g4-wall', text: 'wall', meaning: '墙壁', unit: '家居生活', difficulty: 1, tags: ['home'] },
  { id: 'g4-floor', text: 'floor', meaning: '地板', unit: '家居生活', difficulty: 2, tags: ['home'] },
  { id: 'g4-table', text: 'table', meaning: '餐桌', unit: '家居生活', difficulty: 2, tags: ['home'] },
  { id: 'g4-lamp', text: 'lamp', meaning: '台灯', unit: '家居生活', difficulty: 1, tags: ['home'] },
  { id: 'g4-clock', text: 'clock', meaning: '时钟', unit: '家居生活', difficulty: 2, tags: ['home', 'time'] },
  { id: 'g4-phone', text: 'phone', meaning: '电话', unit: '家居生活', difficulty: 2, tags: ['home', 'technology'] },
  { id: 'g4-picture', text: 'picture', meaning: '图画', unit: '家居生活', difficulty: 3, tags: ['home'] },
  { id: 'g4-key', text: 'key', meaning: '钥匙', unit: '家居生活', difficulty: 1, tags: ['home', 'short'] },
  { id: 'g4-toy', text: 'toy', meaning: '玩具', unit: '家居生活', difficulty: 1, tags: ['home', 'short'] },

  // 食物与用餐（23）
  { id: 'g4-food', text: 'food', meaning: '食物', unit: '食物与用餐', difficulty: 1, tags: ['food'] },
  { id: 'g4-rice', text: 'rice', meaning: '米饭', unit: '食物与用餐', difficulty: 1, tags: ['food'] },
  { id: 'g4-noodles', text: 'noodles', meaning: '面条', unit: '食物与用餐', difficulty: 3, tags: ['food'] },
  { id: 'g4-bread', text: 'bread', meaning: '面包', unit: '食物与用餐', difficulty: 2, tags: ['food'] },
  { id: 'g4-cake', text: 'cake', meaning: '蛋糕', unit: '食物与用餐', difficulty: 1, tags: ['food'] },
  { id: 'g4-egg', text: 'egg', meaning: '鸡蛋', unit: '食物与用餐', difficulty: 1, tags: ['food', 'short'] },
  { id: 'g4-milk', text: 'milk', meaning: '牛奶', unit: '食物与用餐', difficulty: 1, tags: ['food', 'drink'] },
  { id: 'g4-water', text: 'water', meaning: '水', unit: '食物与用餐', difficulty: 2, tags: ['drink'] },
  { id: 'g4-juice', text: 'juice', meaning: '果汁', unit: '食物与用餐', difficulty: 2, tags: ['drink'] },
  { id: 'g4-apple', text: 'apple', meaning: '苹果', unit: '食物与用餐', difficulty: 2, tags: ['food', 'fruit'] },
  { id: 'g4-banana', text: 'banana', meaning: '香蕉', unit: '食物与用餐', difficulty: 2, tags: ['food', 'fruit'] },
  { id: 'g4-orange', text: 'orange', meaning: '橙子', unit: '食物与用餐', difficulty: 2, tags: ['food', 'fruit'] },
  { id: 'g4-pear', text: 'pear', meaning: '梨', unit: '食物与用餐', difficulty: 1, tags: ['food', 'fruit'] },
  { id: 'g4-grape', text: 'grape', meaning: '葡萄', unit: '食物与用餐', difficulty: 2, tags: ['food', 'fruit'] },
  { id: 'g4-tomato', text: 'tomato', meaning: '西红柿', unit: '食物与用餐', difficulty: 2, tags: ['food', 'vegetable'] },
  { id: 'g4-potato', text: 'potato', meaning: '土豆', unit: '食物与用餐', difficulty: 2, tags: ['food', 'vegetable'] },
  { id: 'g4-chicken', text: 'chicken', meaning: '鸡肉', unit: '食物与用餐', difficulty: 3, tags: ['food'] },
  { id: 'g4-beef', text: 'beef', meaning: '牛肉', unit: '食物与用餐', difficulty: 1, tags: ['food'] },
  { id: 'g4-breakfast', text: 'breakfast', meaning: '早餐', unit: '食物与用餐', difficulty: 4, tags: ['food', 'meal', 'long'] },
  { id: 'g4-lunch', text: 'lunch', meaning: '午餐', unit: '食物与用餐', difficulty: 2, tags: ['food', 'meal'] },
  { id: 'g4-dinner', text: 'dinner', meaning: '晚餐', unit: '食物与用餐', difficulty: 2, tags: ['food', 'meal'] },
  { id: 'g4-hungry', text: 'hungry', meaning: '饥饿的', unit: '食物与用餐', difficulty: 3, tags: ['feeling'] },
  { id: 'g4-thirsty', text: 'thirsty', meaning: '口渴的', unit: '食物与用餐', difficulty: 3, tags: ['feeling'] },

  // 颜色与服装（21）
  { id: 'exp-green', text: 'green', meaning: '绿色', unit: '颜色与服装', difficulty: 2, tags: ['color'] },
  { id: 'exp-yellow', text: 'yellow', meaning: '黄色', unit: '颜色与服装', difficulty: 2, tags: ['color'] },
  { id: 'g4-red', text: 'red', meaning: '红色', unit: '颜色与服装', difficulty: 1, tags: ['color', 'short'] },
  { id: 'g4-blue', text: 'blue', meaning: '蓝色', unit: '颜色与服装', difficulty: 1, tags: ['color'] },
  { id: 'g4-white', text: 'white', meaning: '白色', unit: '颜色与服装', difficulty: 2, tags: ['color'] },
  { id: 'g4-black', text: 'black', meaning: '黑色', unit: '颜色与服装', difficulty: 2, tags: ['color'] },
  { id: 'g4-brown', text: 'brown', meaning: '棕色', unit: '颜色与服装', difficulty: 2, tags: ['color'] },
  { id: 'g4-purple', text: 'purple', meaning: '紫色', unit: '颜色与服装', difficulty: 2, tags: ['color'] },
  { id: 'g4-pink', text: 'pink', meaning: '粉色', unit: '颜色与服装', difficulty: 1, tags: ['color'] },
  { id: 'g4-shirt', text: 'shirt', meaning: '衬衫', unit: '颜色与服装', difficulty: 2, tags: ['clothes'] },
  { id: 'g4-skirt', text: 'skirt', meaning: '短裙', unit: '颜色与服装', difficulty: 2, tags: ['clothes'] },
  { id: 'g4-dress', text: 'dress', meaning: '连衣裙', unit: '颜色与服装', difficulty: 2, tags: ['clothes'] },
  { id: 'g4-coat', text: 'coat', meaning: '外套', unit: '颜色与服装', difficulty: 1, tags: ['clothes'] },
  { id: 'g4-jacket', text: 'jacket', meaning: '夹克', unit: '颜色与服装', difficulty: 2, tags: ['clothes'] },
  { id: 'g4-trousers', text: 'trousers', meaning: '长裤', unit: '颜色与服装', difficulty: 3, tags: ['clothes', 'long'] },
  { id: 'g4-shorts', text: 'shorts', meaning: '短裤', unit: '颜色与服装', difficulty: 2, tags: ['clothes'] },
  { id: 'g4-shoes', text: 'shoes', meaning: '鞋子', unit: '颜色与服装', difficulty: 2, tags: ['clothes'] },
  { id: 'g4-socks', text: 'socks', meaning: '袜子', unit: '颜色与服装', difficulty: 2, tags: ['clothes'] },
  { id: 'g4-hat', text: 'hat', meaning: '帽子', unit: '颜色与服装', difficulty: 1, tags: ['clothes', 'short'] },
  { id: 'g4-cap', text: 'cap', meaning: '鸭舌帽', unit: '颜色与服装', difficulty: 1, tags: ['clothes', 'short'] },
  { id: 'g4-sweater', text: 'sweater', meaning: '毛衣', unit: '颜色与服装', difficulty: 3, tags: ['clothes'] },

  // 时间与天气（19）
  { id: 'exp-morning', text: 'morning', meaning: '早晨', unit: '时间与天气', difficulty: 3, tags: ['time'] },
  { id: 'g4-today', text: 'today', meaning: '今天', unit: '时间与天气', difficulty: 2, tags: ['time'] },
  { id: 'g4-tomorrow', text: 'tomorrow', meaning: '明天', unit: '时间与天气', difficulty: 3, tags: ['time', 'long'] },
  { id: 'g4-yesterday', text: 'yesterday', meaning: '昨天', unit: '时间与天气', difficulty: 4, tags: ['time', 'long'] },
  { id: 'g4-afternoon', text: 'afternoon', meaning: '下午', unit: '时间与天气', difficulty: 4, tags: ['time', 'long'] },
  { id: 'g4-evening', text: 'evening', meaning: '傍晚', unit: '时间与天气', difficulty: 3, tags: ['time'] },
  { id: 'g4-night', text: 'night', meaning: '夜晚', unit: '时间与天气', difficulty: 2, tags: ['time'] },
  { id: 'g4-week', text: 'week', meaning: '星期', unit: '时间与天气', difficulty: 1, tags: ['time'] },
  { id: 'g4-month', text: 'month', meaning: '月份', unit: '时间与天气', difficulty: 2, tags: ['time'] },
  { id: 'g4-year', text: 'year', meaning: '年份', unit: '时间与天气', difficulty: 1, tags: ['time'] },
  { id: 'g4-spring', text: 'spring', meaning: '春天', unit: '时间与天气', difficulty: 2, tags: ['season'] },
  { id: 'g4-summer', text: 'summer', meaning: '夏天', unit: '时间与天气', difficulty: 2, tags: ['season'] },
  { id: 'g4-autumn', text: 'autumn', meaning: '秋天', unit: '时间与天气', difficulty: 2, tags: ['season'] },
  { id: 'g4-winter', text: 'winter', meaning: '冬天', unit: '时间与天气', difficulty: 2, tags: ['season'] },
  { id: 'g4-rain', text: 'rain', meaning: '雨', unit: '时间与天气', difficulty: 1, tags: ['weather'] },
  { id: 'g4-snow', text: 'snow', meaning: '雪', unit: '时间与天气', difficulty: 1, tags: ['weather'] },
  { id: 'g4-wind', text: 'wind', meaning: '风', unit: '时间与天气', difficulty: 1, tags: ['weather'] },
  { id: 'g4-cloud', text: 'cloud', meaning: '云朵', unit: '时间与天气', difficulty: 2, tags: ['weather'] },
  { id: 'g4-weather', text: 'weather', meaning: '天气', unit: '时间与天气', difficulty: 3, tags: ['weather'] },

  // 常用动作（9）
  { id: 'exp-jump', text: 'jump', meaning: '跳跃', unit: '常用动作', difficulty: 1, tags: ['action'] },
  { id: 'g4-run', text: 'run', meaning: '跑步', unit: '常用动作', difficulty: 1, tags: ['action', 'short'] },
  { id: 'g4-walk', text: 'walk', meaning: '行走', unit: '常用动作', difficulty: 1, tags: ['action'] },
  { id: 'g4-swim', text: 'swim', meaning: '游泳', unit: '常用动作', difficulty: 1, tags: ['action'] },
  { id: 'g4-sing', text: 'sing', meaning: '唱歌', unit: '常用动作', difficulty: 1, tags: ['action'] },
  { id: 'g4-dance', text: 'dance', meaning: '跳舞', unit: '常用动作', difficulty: 2, tags: ['action'] },
  { id: 'g4-read', text: 'read', meaning: '阅读', unit: '常用动作', difficulty: 1, tags: ['action'] },
  { id: 'g4-write', text: 'write', meaning: '书写', unit: '常用动作', difficulty: 2, tags: ['action'] },
  { id: 'g4-draw', text: 'draw', meaning: '画画', unit: '常用动作', difficulty: 1, tags: ['action'] },
]

const LEGACY_WORD_ORDER = [
  'exp-cat',
  'exp-book',
  'exp-green',
  'exp-frog',
  'exp-river',
  'exp-jump',
  'exp-school',
  'exp-friend',
  'exp-yellow',
  'exp-window',
  'exp-teacher',
  'exp-morning',
]

export const GRADE_4_WORDS: WordEntry[] = GRADE_4_WORD_SEEDS
  .map(grade4Word)
  .sort((left, right) => {
    const leftIndex = LEGACY_WORD_ORDER.indexOf(left.id)
    const rightIndex = LEGACY_WORD_ORDER.indexOf(right.id)
    if (leftIndex === -1 && rightIndex === -1) return 0
    if (leftIndex === -1) return 1
    if (rightIndex === -1) return -1
    return leftIndex - rightIndex
  })

// Compatibility alias for existing imports and persisted legacy word IDs.
export const EXPERIENCE_WORDS = GRADE_4_WORDS
