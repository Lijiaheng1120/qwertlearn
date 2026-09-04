import type { WordEntry } from './models'
import {
  GRADE_4_WORDS,
  GRADE_4_WORD_PACK_ID,
  GRADE_4_WORD_PACK_NAME,
} from './grade-4-word-bank'

export type VocabularyLevelId = 'grade4' | 'grade5' | 'grade6' | 'junior'

export interface VocabularyLevelDefinition {
  id: VocabularyLevelId
  label: string
  shortLabel: string
  description: string
  wordPackId: string
  grade: number
  words: WordEntry[]
}

type ProgressiveWordSeed = Pick<WordEntry, 'id' | 'text' | 'meaning' | 'unit' | 'difficulty' | 'tags'>

function progressiveWords(grade: number, seeds: ProgressiveWordSeed[]): WordEntry[] {
  return seeds.map((seed) => ({
    ...seed,
    grade,
    tags: [...seed.tags, `grade-${grade}`, 'fltrp-aligned'],
  }))
}

const GRADE_5_SEEDS: ProgressiveWordSeed[] = [
  // 地点与交通（20）
  { id: 'g5-airport', text: 'airport', meaning: '机场', unit: '地点与交通', difficulty: 3, tags: ['place', 'travel'] },
  { id: 'g5-station', text: 'station', meaning: '车站', unit: '地点与交通', difficulty: 3, tags: ['place', 'travel'] },
  { id: 'g5-cinema', text: 'cinema', meaning: '电影院', unit: '地点与交通', difficulty: 3, tags: ['place'] },
  { id: 'g5-museum', text: 'museum', meaning: '博物馆', unit: '地点与交通', difficulty: 3, tags: ['place'] },
  { id: 'g5-supermarket', text: 'supermarket', meaning: '超市', unit: '地点与交通', difficulty: 5, tags: ['place', 'long'] },
  { id: 'g5-hospital', text: 'hospital', meaning: '医院', unit: '地点与交通', difficulty: 4, tags: ['place'] },
  { id: 'g5-restaurant', text: 'restaurant', meaning: '餐馆', unit: '地点与交通', difficulty: 5, tags: ['place', 'long'] },
  { id: 'g5-hotel', text: 'hotel', meaning: '宾馆', unit: '地点与交通', difficulty: 2, tags: ['place'] },
  { id: 'g5-bank', text: 'bank', meaning: '银行', unit: '地点与交通', difficulty: 2, tags: ['place'] },
  { id: 'g5-office', text: 'office', meaning: '办公室', unit: '地点与交通', difficulty: 3, tags: ['place'] },
  { id: 'g5-factory', text: 'factory', meaning: '工厂', unit: '地点与交通', difficulty: 3, tags: ['place'] },
  { id: 'g5-farm', text: 'farm', meaning: '农场', unit: '地点与交通', difficulty: 2, tags: ['place'] },
  { id: 'g5-village', text: 'village', meaning: '村庄', unit: '地点与交通', difficulty: 3, tags: ['place'] },
  { id: 'g5-city', text: 'city', meaning: '城市', unit: '地点与交通', difficulty: 2, tags: ['place'] },
  { id: 'g5-street', text: 'street', meaning: '街道', unit: '地点与交通', difficulty: 3, tags: ['place'] },
  { id: 'g5-bridge', text: 'bridge', meaning: '桥梁', unit: '地点与交通', difficulty: 3, tags: ['place'] },
  { id: 'g5-traffic', text: 'traffic', meaning: '交通', unit: '地点与交通', difficulty: 3, tags: ['travel'] },
  { id: 'g5-journey', text: 'journey', meaning: '旅程', unit: '地点与交通', difficulty: 3, tags: ['travel'] },
  { id: 'g5-bicycle', text: 'bicycle', meaning: '自行车', unit: '地点与交通', difficulty: 3, tags: ['travel'] },
  { id: 'g5-subway', text: 'subway', meaning: '地铁', unit: '地点与交通', difficulty: 3, tags: ['travel'] },

  // 人物与职业（10）
  { id: 'g5-doctor', text: 'doctor', meaning: '医生', unit: '人物与职业', difficulty: 3, tags: ['job', 'people'] },
  { id: 'g5-nurse', text: 'nurse', meaning: '护士', unit: '人物与职业', difficulty: 2, tags: ['job', 'people'] },
  { id: 'g5-driver', text: 'driver', meaning: '司机', unit: '人物与职业', difficulty: 3, tags: ['job', 'people'] },
  { id: 'g5-farmer', text: 'farmer', meaning: '农民', unit: '人物与职业', difficulty: 3, tags: ['job', 'people'] },
  { id: 'g5-worker', text: 'worker', meaning: '工人', unit: '人物与职业', difficulty: 3, tags: ['job', 'people'] },
  { id: 'g5-policeman', text: 'policeman', meaning: '警察', unit: '人物与职业', difficulty: 4, tags: ['job', 'people'] },
  { id: 'g5-actor', text: 'actor', meaning: '演员', unit: '人物与职业', difficulty: 2, tags: ['job', 'people'] },
  { id: 'g5-singer', text: 'singer', meaning: '歌手', unit: '人物与职业', difficulty: 3, tags: ['job', 'people'] },
  { id: 'g5-writer', text: 'writer', meaning: '作家', unit: '人物与职业', difficulty: 3, tags: ['job', 'people'] },
  { id: 'g5-pilot', text: 'pilot', meaning: '飞行员', unit: '人物与职业', difficulty: 2, tags: ['job', 'people'] },

  // 日常活动与爱好（20）
  { id: 'g5-visit', text: 'visit', meaning: '参观', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-travel', text: 'travel', meaning: '旅行', unit: '日常活动与爱好', difficulty: 3, tags: ['action'] },
  { id: 'g5-arrive', text: 'arrive', meaning: '到达', unit: '日常活动与爱好', difficulty: 3, tags: ['action'] },
  { id: 'g5-leave', text: 'leave', meaning: '离开', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-carry', text: 'carry', meaning: '携带', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-bring', text: 'bring', meaning: '带来', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-send', text: 'send', meaning: '发送', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-buy', text: 'buy', meaning: '购买', unit: '日常活动与爱好', difficulty: 1, tags: ['action'] },
  { id: 'g5-sell', text: 'sell', meaning: '出售', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-borrow', text: 'borrow', meaning: '借入', unit: '日常活动与爱好', difficulty: 3, tags: ['action'] },
  { id: 'g5-return', text: 'return', meaning: '归还', unit: '日常活动与爱好', difficulty: 3, tags: ['action'] },
  { id: 'g5-collect', text: 'collect', meaning: '收集', unit: '日常活动与爱好', difficulty: 3, tags: ['action'] },
  { id: 'g5-learn', text: 'learn', meaning: '学习', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-practice', text: 'practice', meaning: '练习', unit: '日常活动与爱好', difficulty: 4, tags: ['action'] },
  { id: 'g5-exercise', text: 'exercise', meaning: '锻炼', unit: '日常活动与爱好', difficulty: 4, tags: ['action'] },
  { id: 'g5-cook', text: 'cook', meaning: '烹饪', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-watch', text: 'watch', meaning: '观看', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-photograph', text: 'photograph', meaning: '照片', unit: '日常活动与爱好', difficulty: 5, tags: ['hobby', 'long'] },
  { id: 'g5-climb', text: 'climb', meaning: '攀爬', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },
  { id: 'g5-skate', text: 'skate', meaning: '滑冰', unit: '日常活动与爱好', difficulty: 2, tags: ['action'] },

  // 描述与感受（15）
  { id: 'g5-busy', text: 'busy', meaning: '忙碌的', unit: '描述与感受', difficulty: 2, tags: ['adjective'] },
  { id: 'g5-free', text: 'free', meaning: '空闲的', unit: '描述与感受', difficulty: 2, tags: ['adjective'] },
  { id: 'g5-tired', text: 'tired', meaning: '疲倦的', unit: '描述与感受', difficulty: 2, tags: ['feeling'] },
  { id: 'g5-excited', text: 'excited', meaning: '兴奋的', unit: '描述与感受', difficulty: 4, tags: ['feeling'] },
  { id: 'g5-afraid', text: 'afraid', meaning: '害怕的', unit: '描述与感受', difficulty: 3, tags: ['feeling'] },
  { id: 'g5-angry', text: 'angry', meaning: '生气的', unit: '描述与感受', difficulty: 2, tags: ['feeling'] },
  { id: 'g5-clever', text: 'clever', meaning: '聪明的', unit: '描述与感受', difficulty: 3, tags: ['adjective'] },
  { id: 'g5-careful', text: 'careful', meaning: '仔细的', unit: '描述与感受', difficulty: 3, tags: ['adjective'] },
  { id: 'g5-helpful', text: 'helpful', meaning: '乐于助人的', unit: '描述与感受', difficulty: 3, tags: ['adjective'] },
  { id: 'g5-healthy', text: 'healthy', meaning: '健康的', unit: '描述与感受', difficulty: 3, tags: ['adjective'] },
  { id: 'g5-delicious', text: 'delicious', meaning: '美味的', unit: '描述与感受', difficulty: 4, tags: ['adjective'] },
  { id: 'g5-expensive', text: 'expensive', meaning: '昂贵的', unit: '描述与感受', difficulty: 4, tags: ['adjective'] },
  { id: 'g5-cheap', text: 'cheap', meaning: '便宜的', unit: '描述与感受', difficulty: 2, tags: ['adjective'] },
  { id: 'g5-famous', text: 'famous', meaning: '著名的', unit: '描述与感受', difficulty: 3, tags: ['adjective'] },
  { id: 'g5-special', text: 'special', meaning: '特别的', unit: '描述与感受', difficulty: 3, tags: ['adjective'] },

  // 时间与频率（15）
  { id: 'g5-always', text: 'always', meaning: '总是', unit: '时间与频率', difficulty: 3, tags: ['frequency'] },
  { id: 'g5-usually', text: 'usually', meaning: '通常', unit: '时间与频率', difficulty: 4, tags: ['frequency'] },
  { id: 'g5-often', text: 'often', meaning: '经常', unit: '时间与频率', difficulty: 2, tags: ['frequency'] },
  { id: 'g5-sometimes', text: 'sometimes', meaning: '有时', unit: '时间与频率', difficulty: 5, tags: ['frequency', 'long'] },
  { id: 'g5-never', text: 'never', meaning: '从不', unit: '时间与频率', difficulty: 2, tags: ['frequency'] },
  { id: 'g5-early', text: 'early', meaning: '早地', unit: '时间与频率', difficulty: 2, tags: ['time'] },
  { id: 'g5-late', text: 'late', meaning: '迟地', unit: '时间与频率', difficulty: 2, tags: ['time'] },
  { id: 'g5-before', text: 'before', meaning: '在……之前', unit: '时间与频率', difficulty: 3, tags: ['time'] },
  { id: 'g5-after', text: 'after', meaning: '在……之后', unit: '时间与频率', difficulty: 2, tags: ['time'] },
  { id: 'g5-during', text: 'during', meaning: '在……期间', unit: '时间与频率', difficulty: 3, tags: ['time'] },
  { id: 'g5-weekend', text: 'weekend', meaning: '周末', unit: '时间与频率', difficulty: 3, tags: ['time'] },
  { id: 'g5-holiday', text: 'holiday', meaning: '假期', unit: '时间与频率', difficulty: 3, tags: ['time'] },
  { id: 'g5-birthday', text: 'birthday', meaning: '生日', unit: '时间与频率', difficulty: 4, tags: ['event'] },
  { id: 'g5-present', text: 'present', meaning: '礼物', unit: '时间与频率', difficulty: 3, tags: ['event'] },
  { id: 'g5-party', text: 'party', meaning: '聚会', unit: '时间与频率', difficulty: 2, tags: ['event'] },
]

const GRADE_6_SEEDS: ProgressiveWordSeed[] = [
  // 学习与交流（20）
  { id: 'g6-language', text: 'language', meaning: '语言', unit: '学习与交流', difficulty: 4, tags: ['learning'] },
  { id: 'g6-question', text: 'question', meaning: '问题', unit: '学习与交流', difficulty: 4, tags: ['learning'] },
  { id: 'g6-answer', text: 'answer', meaning: '答案', unit: '学习与交流', difficulty: 3, tags: ['learning'] },
  { id: 'g6-sentence', text: 'sentence', meaning: '句子', unit: '学习与交流', difficulty: 4, tags: ['learning'] },
  { id: 'g6-paragraph', text: 'paragraph', meaning: '段落', unit: '学习与交流', difficulty: 5, tags: ['learning', 'long'] },
  { id: 'g6-story', text: 'story', meaning: '故事', unit: '学习与交流', difficulty: 2, tags: ['learning'] },
  { id: 'g6-history', text: 'history', meaning: '历史', unit: '学习与交流', difficulty: 3, tags: ['subject'] },
  { id: 'g6-geography', text: 'geography', meaning: '地理', unit: '学习与交流', difficulty: 5, tags: ['subject', 'long'] },
  { id: 'g6-project', text: 'project', meaning: '项目', unit: '学习与交流', difficulty: 3, tags: ['learning'] },
  { id: 'g6-report', text: 'report', meaning: '报告', unit: '学习与交流', difficulty: 3, tags: ['learning'] },
  { id: 'g6-example', text: 'example', meaning: '例子', unit: '学习与交流', difficulty: 3, tags: ['learning'] },
  { id: 'g6-information', text: 'information', meaning: '信息', unit: '学习与交流', difficulty: 5, tags: ['learning', 'long'] },
  { id: 'g6-message', text: 'message', meaning: '消息', unit: '学习与交流', difficulty: 3, tags: ['communication'] },
  { id: 'g6-letter', text: 'letter', meaning: '信件', unit: '学习与交流', difficulty: 3, tags: ['communication'] },
  { id: 'g6-email', text: 'email', meaning: '电子邮件', unit: '学习与交流', difficulty: 2, tags: ['communication'] },
  { id: 'g6-internet', text: 'internet', meaning: '互联网', unit: '学习与交流', difficulty: 4, tags: ['technology'] },
  { id: 'g6-website', text: 'website', meaning: '网站', unit: '学习与交流', difficulty: 3, tags: ['technology'] },
  { id: 'g6-newspaper', text: 'newspaper', meaning: '报纸', unit: '学习与交流', difficulty: 5, tags: ['reading', 'long'] },
  { id: 'g6-magazine', text: 'magazine', meaning: '杂志', unit: '学习与交流', difficulty: 4, tags: ['reading'] },
  { id: 'g6-dictionary', text: 'dictionary', meaning: '词典', unit: '学习与交流', difficulty: 5, tags: ['learning', 'long'] },

  // 科学与环境（20）
  { id: 'g6-earth', text: 'earth', meaning: '地球', unit: '科学与环境', difficulty: 2, tags: ['science'] },
  { id: 'g6-world', text: 'world', meaning: '世界', unit: '科学与环境', difficulty: 2, tags: ['science'] },
  { id: 'g6-space', text: 'space', meaning: '太空', unit: '科学与环境', difficulty: 2, tags: ['science'] },
  { id: 'g6-planet', text: 'planet', meaning: '行星', unit: '科学与环境', difficulty: 3, tags: ['science'] },
  { id: 'g6-energy', text: 'energy', meaning: '能源', unit: '科学与环境', difficulty: 3, tags: ['science'] },
  { id: 'g6-nature', text: 'nature', meaning: '自然', unit: '科学与环境', difficulty: 3, tags: ['nature'] },
  { id: 'g6-environment', text: 'environment', meaning: '环境', unit: '科学与环境', difficulty: 5, tags: ['nature', 'long'] },
  { id: 'g6-pollution', text: 'pollution', meaning: '污染', unit: '科学与环境', difficulty: 5, tags: ['nature'] },
  { id: 'g6-recycle', text: 'recycle', meaning: '回收利用', unit: '科学与环境', difficulty: 4, tags: ['nature', 'action'] },
  { id: 'g6-protect', text: 'protect', meaning: '保护', unit: '科学与环境', difficulty: 3, tags: ['nature', 'action'] },
  { id: 'g6-save', text: 'save', meaning: '节约', unit: '科学与环境', difficulty: 2, tags: ['nature', 'action'] },
  { id: 'g6-waste', text: 'waste', meaning: '浪费', unit: '科学与环境', difficulty: 2, tags: ['nature'] },
  { id: 'g6-plastic', text: 'plastic', meaning: '塑料', unit: '科学与环境', difficulty: 3, tags: ['material'] },
  { id: 'g6-metal', text: 'metal', meaning: '金属', unit: '科学与环境', difficulty: 2, tags: ['material'] },
  { id: 'g6-wood', text: 'wood', meaning: '木材', unit: '科学与环境', difficulty: 2, tags: ['material'] },
  { id: 'g6-air', text: 'air', meaning: '空气', unit: '科学与环境', difficulty: 1, tags: ['science'] },
  { id: 'g6-fire', text: 'fire', meaning: '火焰', unit: '科学与环境', difficulty: 2, tags: ['science'] },
  { id: 'g6-light', text: 'light', meaning: '光线', unit: '科学与环境', difficulty: 2, tags: ['science'] },
  { id: 'g6-sound', text: 'sound', meaning: '声音', unit: '科学与环境', difficulty: 2, tags: ['science'] },
  { id: 'g6-temperature', text: 'temperature', meaning: '温度', unit: '科学与环境', difficulty: 5, tags: ['science', 'long'] },

  // 思考与行动（20）
  { id: 'g6-understand', text: 'understand', meaning: '理解', unit: '思考与行动', difficulty: 5, tags: ['action', 'thinking'] },
  { id: 'g6-remember', text: 'remember', meaning: '记住', unit: '思考与行动', difficulty: 4, tags: ['action', 'thinking'] },
  { id: 'g6-forget', text: 'forget', meaning: '忘记', unit: '思考与行动', difficulty: 3, tags: ['action', 'thinking'] },
  { id: 'g6-decide', text: 'decide', meaning: '决定', unit: '思考与行动', difficulty: 3, tags: ['action', 'thinking'] },
  { id: 'g6-plan', text: 'plan', meaning: '计划', unit: '思考与行动', difficulty: 2, tags: ['action'] },
  { id: 'g6-prepare', text: 'prepare', meaning: '准备', unit: '思考与行动', difficulty: 3, tags: ['action'] },
  { id: 'g6-finish', text: 'finish', meaning: '完成', unit: '思考与行动', difficulty: 3, tags: ['action'] },
  { id: 'g6-begin', text: 'begin', meaning: '开始', unit: '思考与行动', difficulty: 2, tags: ['action'] },
  { id: 'g6-continue', text: 'continue', meaning: '继续', unit: '思考与行动', difficulty: 4, tags: ['action'] },
  { id: 'g6-happen', text: 'happen', meaning: '发生', unit: '思考与行动', difficulty: 3, tags: ['action'] },
  { id: 'g6-become', text: 'become', meaning: '变成', unit: '思考与行动', difficulty: 3, tags: ['action'] },
  { id: 'g6-believe', text: 'believe', meaning: '相信', unit: '思考与行动', difficulty: 4, tags: ['thinking'] },
  { id: 'g6-agree', text: 'agree', meaning: '同意', unit: '思考与行动', difficulty: 2, tags: ['thinking'] },
  { id: 'g6-choose', text: 'choose', meaning: '选择', unit: '思考与行动', difficulty: 3, tags: ['action'] },
  { id: 'g6-explain', text: 'explain', meaning: '解释', unit: '思考与行动', difficulty: 3, tags: ['communication'] },
  { id: 'g6-compare', text: 'compare', meaning: '比较', unit: '思考与行动', difficulty: 3, tags: ['thinking'] },
  { id: 'g6-build', text: 'build', meaning: '建造', unit: '思考与行动', difficulty: 2, tags: ['action'] },
  { id: 'g6-improve', text: 'improve', meaning: '提高', unit: '思考与行动', difficulty: 3, tags: ['action'] },
  { id: 'g6-change', text: 'change', meaning: '改变', unit: '思考与行动', difficulty: 3, tags: ['action'] },
  { id: 'g6-follow', text: 'follow', meaning: '跟随', unit: '思考与行动', difficulty: 3, tags: ['action'] },

  // 进阶描述（20）
  { id: 'g6-important', text: 'important', meaning: '重要的', unit: '进阶描述', difficulty: 5, tags: ['adjective'] },
  { id: 'g6-different', text: 'different', meaning: '不同的', unit: '进阶描述', difficulty: 5, tags: ['adjective'] },
  { id: 'g6-difficult', text: 'difficult', meaning: '困难的', unit: '进阶描述', difficulty: 4, tags: ['adjective'] },
  { id: 'g6-possible', text: 'possible', meaning: '可能的', unit: '进阶描述', difficulty: 4, tags: ['adjective'] },
  { id: 'g6-popular', text: 'popular', meaning: '受欢迎的', unit: '进阶描述', difficulty: 3, tags: ['adjective'] },
  { id: 'g6-interesting', text: 'interesting', meaning: '有趣的', unit: '进阶描述', difficulty: 5, tags: ['adjective', 'long'] },
  { id: 'g6-wonderful', text: 'wonderful', meaning: '精彩的', unit: '进阶描述', difficulty: 5, tags: ['adjective'] },
  { id: 'g6-dangerous', text: 'dangerous', meaning: '危险的', unit: '进阶描述', difficulty: 4, tags: ['adjective'] },
  { id: 'g6-safe', text: 'safe', meaning: '安全的', unit: '进阶描述', difficulty: 2, tags: ['adjective'] },
  { id: 'g6-useful', text: 'useful', meaning: '有用的', unit: '进阶描述', difficulty: 3, tags: ['adjective'] },
  { id: 'g6-ready', text: 'ready', meaning: '准备好的', unit: '进阶描述', difficulty: 2, tags: ['adjective'] },
  { id: 'g6-alone', text: 'alone', meaning: '独自的', unit: '进阶描述', difficulty: 2, tags: ['adjective'] },
  { id: 'g6-together', text: 'together', meaning: '一起', unit: '进阶描述', difficulty: 4, tags: ['adverb'] },
  { id: 'g6-enough', text: 'enough', meaning: '足够的', unit: '进阶描述', difficulty: 3, tags: ['adjective'] },
  { id: 'g6-almost', text: 'almost', meaning: '几乎', unit: '进阶描述', difficulty: 3, tags: ['adverb'] },
  { id: 'g6-already', text: 'already', meaning: '已经', unit: '进阶描述', difficulty: 3, tags: ['adverb'] },
  { id: 'g6-finally', text: 'finally', meaning: '最后', unit: '进阶描述', difficulty: 3, tags: ['adverb'] },
  { id: 'g6-quickly', text: 'quickly', meaning: '快速地', unit: '进阶描述', difficulty: 3, tags: ['adverb'] },
  { id: 'g6-slowly', text: 'slowly', meaning: '缓慢地', unit: '进阶描述', difficulty: 3, tags: ['adverb'] },
  { id: 'g6-carefully', text: 'carefully', meaning: '认真地', unit: '进阶描述', difficulty: 4, tags: ['adverb'] },
]

const JUNIOR_SEEDS: ProgressiveWordSeed[] = [
  // 初中学习与成长（20）
  { id: 'j7-grammar', text: 'grammar', meaning: '语法', unit: '初中学习与成长', difficulty: 3, tags: ['learning'] },
  { id: 'j7-vocabulary', text: 'vocabulary', meaning: '词汇', unit: '初中学习与成长', difficulty: 5, tags: ['learning', 'long'] },
  { id: 'j7-pronunciation', text: 'pronunciation', meaning: '发音', unit: '初中学习与成长', difficulty: 5, tags: ['learning', 'long'] },
  { id: 'j7-conversation', text: 'conversation', meaning: '对话', unit: '初中学习与成长', difficulty: 5, tags: ['communication', 'long'] },
  { id: 'j7-knowledge', text: 'knowledge', meaning: '知识', unit: '初中学习与成长', difficulty: 5, tags: ['learning'] },
  { id: 'j7-education', text: 'education', meaning: '教育', unit: '初中学习与成长', difficulty: 5, tags: ['learning'] },
  { id: 'j7-culture', text: 'culture', meaning: '文化', unit: '初中学习与成长', difficulty: 3, tags: ['society'] },
  { id: 'j7-tradition', text: 'tradition', meaning: '传统', unit: '初中学习与成长', difficulty: 4, tags: ['society'] },
  { id: 'j7-future', text: 'future', meaning: '未来', unit: '初中学习与成长', difficulty: 3, tags: ['growth'] },
  { id: 'j7-dream', text: 'dream', meaning: '梦想', unit: '初中学习与成长', difficulty: 2, tags: ['growth'] },
  { id: 'j7-goal', text: 'goal', meaning: '目标', unit: '初中学习与成长', difficulty: 2, tags: ['growth'] },
  { id: 'j7-success', text: 'success', meaning: '成功', unit: '初中学习与成长', difficulty: 3, tags: ['growth'] },
  { id: 'j7-problem', text: 'problem', meaning: '难题', unit: '初中学习与成长', difficulty: 3, tags: ['learning'] },
  { id: 'j7-reason', text: 'reason', meaning: '原因', unit: '初中学习与成长', difficulty: 3, tags: ['thinking'] },
  { id: 'j7-result', text: 'result', meaning: '结果', unit: '初中学习与成长', difficulty: 3, tags: ['thinking'] },
  { id: 'j7-experience', text: 'experience', meaning: '经历', unit: '初中学习与成长', difficulty: 5, tags: ['growth'] },
  { id: 'j7-activity', text: 'activity', meaning: '活动', unit: '初中学习与成长', difficulty: 4, tags: ['school'] },
  { id: 'j7-competition', text: 'competition', meaning: '比赛', unit: '初中学习与成长', difficulty: 5, tags: ['school', 'long'] },
  { id: 'j7-team', text: 'team', meaning: '团队', unit: '初中学习与成长', difficulty: 2, tags: ['people'] },
  { id: 'j7-member', text: 'member', meaning: '成员', unit: '初中学习与成长', difficulty: 3, tags: ['people'] },

  // 沟通与能力（20）
  { id: 'j7-communicate', text: 'communicate', meaning: '交流', unit: '沟通与能力', difficulty: 5, tags: ['communication'] },
  { id: 'j7-discuss', text: 'discuss', meaning: '讨论', unit: '沟通与能力', difficulty: 3, tags: ['communication'] },
  { id: 'j7-introduce', text: 'introduce', meaning: '介绍', unit: '沟通与能力', difficulty: 4, tags: ['communication'] },
  { id: 'j7-invite', text: 'invite', meaning: '邀请', unit: '沟通与能力', difficulty: 3, tags: ['communication'] },
  { id: 'j7-accept', text: 'accept', meaning: '接受', unit: '沟通与能力', difficulty: 3, tags: ['action'] },
  { id: 'j7-refuse', text: 'refuse', meaning: '拒绝', unit: '沟通与能力', difficulty: 3, tags: ['action'] },
  { id: 'j7-promise', text: 'promise', meaning: '承诺', unit: '沟通与能力', difficulty: 3, tags: ['communication'] },
  { id: 'j7-suggest', text: 'suggest', meaning: '建议', unit: '沟通与能力', difficulty: 3, tags: ['communication'] },
  { id: 'j7-solve', text: 'solve', meaning: '解决', unit: '沟通与能力', difficulty: 2, tags: ['thinking'] },
  { id: 'j7-discover', text: 'discover', meaning: '发现', unit: '沟通与能力', difficulty: 4, tags: ['thinking'] },
  { id: 'j7-create', text: 'create', meaning: '创造', unit: '沟通与能力', difficulty: 3, tags: ['action'] },
  { id: 'j7-develop', text: 'develop', meaning: '发展', unit: '沟通与能力', difficulty: 4, tags: ['action'] },
  { id: 'j7-achieve', text: 'achieve', meaning: '实现', unit: '沟通与能力', difficulty: 4, tags: ['growth'] },
  { id: 'j7-manage', text: 'manage', meaning: '管理', unit: '沟通与能力', difficulty: 3, tags: ['action'] },
  { id: 'j7-support', text: 'support', meaning: '支持', unit: '沟通与能力', difficulty: 3, tags: ['action'] },
  { id: 'j7-share', text: 'share', meaning: '分享', unit: '沟通与能力', difficulty: 2, tags: ['action'] },
  { id: 'j7-respect', text: 'respect', meaning: '尊重', unit: '沟通与能力', difficulty: 3, tags: ['action'] },
  { id: 'j7-include', text: 'include', meaning: '包含', unit: '沟通与能力', difficulty: 3, tags: ['action'] },
  { id: 'j7-depend', text: 'depend', meaning: '依靠', unit: '沟通与能力', difficulty: 3, tags: ['action'] },
  { id: 'j7-celebrate', text: 'celebrate', meaning: '庆祝', unit: '沟通与能力', difficulty: 4, tags: ['event'] },

  // 性格与连接词（20）
  { id: 'j7-confident', text: 'confident', meaning: '自信的', unit: '性格与连接词', difficulty: 4, tags: ['adjective'] },
  { id: 'j7-nervous', text: 'nervous', meaning: '紧张的', unit: '性格与连接词', difficulty: 3, tags: ['feeling'] },
  { id: 'j7-serious', text: 'serious', meaning: '严肃的', unit: '性格与连接词', difficulty: 3, tags: ['adjective'] },
  { id: 'j7-honest', text: 'honest', meaning: '诚实的', unit: '性格与连接词', difficulty: 3, tags: ['adjective'] },
  { id: 'j7-friendly', text: 'friendly', meaning: '友好的', unit: '性格与连接词', difficulty: 4, tags: ['adjective'] },
  { id: 'j7-patient', text: 'patient', meaning: '耐心的', unit: '性格与连接词', difficulty: 3, tags: ['adjective'] },
  { id: 'j7-active', text: 'active', meaning: '积极的', unit: '性格与连接词', difficulty: 3, tags: ['adjective'] },
  { id: 'j7-creative', text: 'creative', meaning: '有创造力的', unit: '性格与连接词', difficulty: 4, tags: ['adjective'] },
  { id: 'j7-independent', text: 'independent', meaning: '独立的', unit: '性格与连接词', difficulty: 5, tags: ['adjective', 'long'] },
  { id: 'j7-successful', text: 'successful', meaning: '成功的', unit: '性格与连接词', difficulty: 5, tags: ['adjective'] },
  { id: 'j7-necessary', text: 'necessary', meaning: '必要的', unit: '性格与连接词', difficulty: 5, tags: ['adjective'] },
  { id: 'j7-certain', text: 'certain', meaning: '确定的', unit: '性格与连接词', difficulty: 3, tags: ['adjective'] },
  { id: 'j7-probably', text: 'probably', meaning: '很可能', unit: '性格与连接词', difficulty: 4, tags: ['adverb'] },
  { id: 'j7-especially', text: 'especially', meaning: '尤其', unit: '性格与连接词', difficulty: 5, tags: ['adverb'] },
  { id: 'j7-suddenly', text: 'suddenly', meaning: '突然', unit: '性格与连接词', difficulty: 4, tags: ['adverb'] },
  { id: 'j7-immediately', text: 'immediately', meaning: '立即', unit: '性格与连接词', difficulty: 5, tags: ['adverb', 'long'] },
  { id: 'j7-recently', text: 'recently', meaning: '最近', unit: '性格与连接词', difficulty: 4, tags: ['adverb'] },
  { id: 'j7-instead', text: 'instead', meaning: '代替', unit: '性格与连接词', difficulty: 3, tags: ['connector'] },
  { id: 'j7-although', text: 'although', meaning: '虽然', unit: '性格与连接词', difficulty: 4, tags: ['connector'] },
  { id: 'j7-because', text: 'because', meaning: '因为', unit: '性格与连接词', difficulty: 3, tags: ['connector'] },

  // 科技与社会（20）
  { id: 'j7-technology', text: 'technology', meaning: '科技', unit: '科技与社会', difficulty: 5, tags: ['technology', 'long'] },
  { id: 'j7-machine', text: 'machine', meaning: '机器', unit: '科技与社会', difficulty: 3, tags: ['technology'] },
  { id: 'j7-robot', text: 'robot', meaning: '机器人', unit: '科技与社会', difficulty: 2, tags: ['technology'] },
  { id: 'j7-program', text: 'program', meaning: '程序', unit: '科技与社会', difficulty: 3, tags: ['technology'] },
  { id: 'j7-screen', text: 'screen', meaning: '屏幕', unit: '科技与社会', difficulty: 3, tags: ['technology'] },
  { id: 'j7-keyboard', text: 'keyboard', meaning: '键盘', unit: '科技与社会', difficulty: 4, tags: ['technology'] },
  { id: 'j7-online', text: 'online', meaning: '在线的', unit: '科技与社会', difficulty: 3, tags: ['technology'] },
  { id: 'j7-video', text: 'video', meaning: '视频', unit: '科技与社会', difficulty: 2, tags: ['technology'] },
  { id: 'j7-camera', text: 'camera', meaning: '相机', unit: '科技与社会', difficulty: 3, tags: ['technology'] },
  { id: 'j7-mobile', text: 'mobile', meaning: '移动设备', unit: '科技与社会', difficulty: 3, tags: ['technology'] },
  { id: 'j7-society', text: 'society', meaning: '社会', unit: '科技与社会', difficulty: 3, tags: ['society'] },
  { id: 'j7-community', text: 'community', meaning: '社区', unit: '科技与社会', difficulty: 5, tags: ['society'] },
  { id: 'j7-public', text: 'public', meaning: '公众的', unit: '科技与社会', difficulty: 3, tags: ['society'] },
  { id: 'j7-health', text: 'health', meaning: '健康', unit: '科技与社会', difficulty: 3, tags: ['health'] },
  { id: 'j7-medicine', text: 'medicine', meaning: '药物', unit: '科技与社会', difficulty: 4, tags: ['health'] },
  { id: 'j7-accident', text: 'accident', meaning: '事故', unit: '科技与社会', difficulty: 4, tags: ['safety'] },
  { id: 'j7-safety', text: 'safety', meaning: '安全', unit: '科技与社会', difficulty: 3, tags: ['safety'] },
  { id: 'j7-climate', text: 'climate', meaning: '气候', unit: '科技与社会', difficulty: 3, tags: ['nature'] },
  { id: 'j7-ocean', text: 'ocean', meaning: '海洋', unit: '科技与社会', difficulty: 3, tags: ['nature'] },
  { id: 'j7-population', text: 'population', meaning: '人口', unit: '科技与社会', difficulty: 5, tags: ['society', 'long'] },
]

export const GRADE_5_WORDS = progressiveWords(5, GRADE_5_SEEDS)
export const GRADE_6_WORDS = progressiveWords(6, GRADE_6_SEEDS)
export const JUNIOR_PREP_WORDS = progressiveWords(7, JUNIOR_SEEDS)

export const DEFAULT_VOCABULARY_LEVEL: VocabularyLevelId = 'grade4'

export const VOCABULARY_LEVELS: readonly VocabularyLevelDefinition[] = [
  {
    id: 'grade4',
    label: '外研版四年级',
    shortLabel: '四年级基础',
    description: '160 个基础与拓展词，适合当前教材阶段。',
    wordPackId: GRADE_4_WORD_PACK_ID,
    grade: 4,
    words: GRADE_4_WORDS,
  },
  {
    id: 'grade5',
    label: '外研版五年级进阶',
    shortLabel: '五年级进阶',
    description: '80 个地点、职业、活动与频率进阶词。',
    wordPackId: 'fltrp-grade5-v1',
    grade: 5,
    words: GRADE_5_WORDS,
  },
  {
    id: 'grade6',
    label: '外研版六年级挑战',
    shortLabel: '六年级挑战',
    description: '80 个学习、环境、思考与描述挑战词。',
    wordPackId: 'fltrp-grade6-v1',
    grade: 6,
    words: GRADE_6_WORDS,
  },
  {
    id: 'junior',
    label: '小升初衔接',
    shortLabel: '未来初中',
    description: '80 个语法、沟通、能力与科技衔接词。',
    wordPackId: 'fltrp-junior-v1',
    grade: 7,
    words: JUNIOR_PREP_WORDS,
  },
]

export function getVocabularyLevel(levelId: VocabularyLevelId): VocabularyLevelDefinition {
  return VOCABULARY_LEVELS.find((level) => level.id === levelId) ?? VOCABULARY_LEVELS[0]
}

export const ALL_VOCABULARY_WORDS: WordEntry[] = VOCABULARY_LEVELS.flatMap((level) => level.words)
