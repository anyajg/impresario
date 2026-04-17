import type { Chapter, Question } from './questions.types';
import Taro from '@tarojs/taro';
import { importedQuestions } from './questions.imported';
import { isInviteUnlocked } from '../utils/storage';

export type { Chapter, Question, QuestionChoiceType } from './questions.types';
export {
  isMultiQuestion,
  getCorrectIndicesSorted,
  normalizeUserSelection,
  isSelectionCorrect,
} from './questions.types';

export const chapters: Chapter[] = [
  { id: 1, name: '政策法规', icon: '法', color: '#0d9488' },
  { id: 2, name: '经纪基础', icon: '基', color: '#0d9488' },
  { id: 3, name: '经纪实务', icon: '务', color: '#0d9488' },
  { id: 4, name: '安全管理', icon: '安', color: '#0d9488' },
];

const baseQuestions: Question[] = [
  // ── Chapter 1: 政策法规 ──
  {
    id: 1,
    chapter: 1,
    content: '根据《营业性演出管理条例》，设立演出经纪机构应当向哪级文化主管部门提出申请？',
    options: ['县级文化主管部门', '省级文化主管部门', '国务院文化主管部门', '市级文化主管部门'],
    answer: 1,
    explanation: '根据《营业性演出管理条例》第六条，设立演出经纪机构，应当向省级人民政府文化主管部门提出申请。',
  },
  {
    id: 2,
    chapter: 1,
    content: '营业性演出是指以什么为目的，通过售票或者包场等方式为公众举办的现场文艺表演活动？',
    options: ['公益', '营利', '宣传', '教育'],
    answer: 1,
    explanation: '根据《营业性演出管理条例》第二条，营业性演出是指以营利为目的、通过售票或者包场等方式为公众举办的现场文艺表演活动。',
  },
  {
    id: 3,
    chapter: 1,
    content: '个体演出经纪人可以从事营业性演出经纪活动的范围是？',
    options: ['全国范围', '所在省级行政区域内', '所在市级行政区域内', '不受地域限制'],
    answer: 1,
    explanation: '个体演出经纪人只能在所在省级行政区域内从事营业性演出经纪活动。',
  },
  {
    id: 4,
    chapter: 1,
    content: '举办营业性演出，应当向演出所在地哪级人民政府文化主管部门提出申请？',
    options: ['乡镇级', '县级', '市级', '省级'],
    answer: 1,
    explanation: '举办营业性演出应当向演出所在地县级人民政府文化主管部门提出申请。',
  },
  {
    id: 5,
    chapter: 1,
    content: '以下哪种行为在营业性演出中是被明确禁止的？',
    options: ['售票', '假唱', '赠票', '包场'],
    answer: 1,
    explanation: '《营业性演出管理条例》明确禁止营业性演出中的假唱行为，演员不得以假唱欺骗观众。',
  },
  {
    id: 6,
    chapter: 1,
    content: '演出场所经营单位应当确保演出场所的建筑、设施符合什么标准？',
    options: ['行业标准', '企业标准', '国家安全标准', '地方标准'],
    answer: 2,
    explanation: '演出场所经营单位应当确保演出场所的建筑、设施符合国家安全标准和消防安全规范。',
  },
  {
    id: 7,
    chapter: 1,
    content: '未经批准举办营业性演出的，由县级以上人民政府文化主管部门责令停止演出，没收违法所得，并处违法所得几倍的罚款？',
    options: ['3倍以上5倍以下', '5倍以上10倍以下', '8倍以上10倍以下', '1倍以上3倍以下'],
    answer: 2,
    explanation: '未经批准举办营业性演出的，由县级以上文化主管部门责令停止演出，没收违法所得，并处违法所得8倍以上10倍以下的罚款。',
  },
  {
    id: 8,
    chapter: 1,
    content: '外国的文艺表演团体、个人在中国进行营业性演出，应由谁负责申报？',
    options: ['外国团体自行申报', '演出经纪机构', '演出场所', '地方文化局'],
    answer: 1,
    explanation: '外国文艺表演团体、个人来华进行营业性演出，应当由具有相应资质的演出经纪机构负责申报。',
  },
  {
    id: 9,
    chapter: 1,
    content: '演出经纪人员资格认定考试合格的，由哪个部门颁发演出经纪资格证书？',
    options: ['当地文化馆', '省级文化主管部门', '国务院文化主管部门', '市级文旅局'],
    answer: 2,
    explanation: '演出经纪人员资格认定考试合格的，由国务院文化主管部门颁发演出经纪资格证书。',
  },
  {
    id: 10,
    chapter: 1,
    content: '演出举办单位在演出场所进行营业性演出，观众人数在多少人以上的为大型演出活动？',
    options: ['1000人', '2000人', '3000人', '5000人'],
    answer: 2,
    explanation: '根据相关规定，观众人数在3000人以上的为大型演出活动，需要额外的安全审批。',
  },

  // ── Chapter 2: 经纪基础 ──
  {
    id: 11,
    chapter: 2,
    content: '演出经纪人是指在演出市场中为实现演出产品的交易进行何种活动的人员？',
    options: ['表演活动', '中介服务', '行政审批', '技术支持'],
    answer: 1,
    explanation: '演出经纪人是指在演出市场上为实现演出产品的交易，进行中介服务并从中获取佣金的人员。',
  },
  {
    id: 12,
    chapter: 2,
    content: '演出市场的三大构成要素是演出产品、演出消费者和？',
    options: ['演出场所', '演出中介', '政府部门', '演出设备'],
    answer: 1,
    explanation: '演出市场由演出产品（供给方）、演出消费者（需求方）和演出中介（连接供需）三大要素构成。',
  },
  {
    id: 13,
    chapter: 2,
    content: '下列哪项不属于演出产品的基本特征？',
    options: ['现场性', '一次性', '可存储性', '综合性'],
    answer: 2,
    explanation: '演出产品具有现场性、一次性、时效性和综合性的特征。演出产品是即时消费的，不可存储。',
  },
  {
    id: 14,
    chapter: 2,
    content: '演出经纪合同按照经纪方式不同，可分为行纪合同和？',
    options: ['居间合同', '买卖合同', '租赁合同', '劳务合同'],
    answer: 0,
    explanation: '演出经纪合同按经纪方式可分为行纪合同（以自己名义代委托人办理）和居间合同（为委托人提供订约机会或媒介服务）。',
  },
  {
    id: 15,
    chapter: 2,
    content: '演出经纪人从事经纪活动的基本原则不包括下列哪项？',
    options: ['自愿原则', '公平原则', '垄断原则', '诚实信用原则'],
    answer: 2,
    explanation: '演出经纪活动应遵循自愿、公平、等价有偿和诚实信用原则，垄断原则不属于基本原则。',
  },
  {
    id: 16,
    chapter: 2,
    content: '演出经纪机构的经纪收入一般占演出项目总收入的比例范围是？',
    options: ['1%~5%', '5%~15%', '15%~30%', '30%~50%'],
    answer: 1,
    explanation: '演出经纪机构的经纪费一般为演出项目总收入的5%~15%，具体比例由合同双方协商确定。',
  },
  {
    id: 17,
    chapter: 2,
    content: '演出经纪人的职业道德核心是什么？',
    options: ['追求利润最大化', '诚实守信', '扩大市场份额', '降低演出成本'],
    answer: 1,
    explanation: '诚实守信是演出经纪人职业道德的核心，是建立长期合作关系和良好行业声誉的基础。',
  },
  {
    id: 18,
    chapter: 2,
    content: '下列哪种不属于演出经纪人的权利？',
    options: ['收取佣金', '独立经营', '强制定价', '获取信息'],
    answer: 2,
    explanation: '演出经纪人有收取佣金、独立经营、获取信息等权利，但无权强制定价，价格应由市场和合同协商确定。',
  },
  {
    id: 19,
    chapter: 2,
    content: '演出市场按演出内容分类，下列哪项不属于演出市场类别？',
    options: ['音乐类', '舞蹈类', '体育类', '曲艺杂技类'],
    answer: 2,
    explanation: '演出市场按内容可分为音乐类、舞蹈类、戏剧类、曲艺杂技类等，体育类不属于演出市场分类。',
  },
  {
    id: 20,
    chapter: 2,
    content: '取得演出经纪资格证后，演出经纪人应在几年内从事演出经纪活动？',
    options: ['1年', '2年', '3年', '5年'],
    answer: 1,
    explanation: '取得演出经纪资格证后应在2年内从事演出经纪活动，逾期未从业需重新参加资格认定。',
  },

  // ── Chapter 3: 经纪实务 ──
  {
    id: 21,
    chapter: 3,
    content: '演出项目策划的首要步骤是什么？',
    options: ['确定演出场地', '市场调研与分析', '签订演出合同', '制定宣传方案'],
    answer: 1,
    explanation: '演出项目策划首先应进行市场调研与分析，了解目标市场需求和竞争情况，才能制定有针对性的策划方案。',
  },
  {
    id: 22,
    chapter: 3,
    content: '演出成本中，通常占比最大的是哪一项？',
    options: ['场地租赁费', '演员劳务费', '宣传推广费', '设备租赁费'],
    answer: 1,
    explanation: '在演出成本构成中，演员劳务费通常是占比最大的支出项目，特别是知名演员参演的项目。',
  },
  {
    id: 23,
    chapter: 3,
    content: '演出票务管理的核心环节是什么？',
    options: ['票面设计', '定价策略', '印刷质量', '票根回收'],
    answer: 1,
    explanation: '定价策略是票务管理的核心，合理的票价直接影响上座率和演出收益，需要综合考虑成本、市场和竞争因素。',
  },
  {
    id: 24,
    chapter: 3,
    content: '下列哪项不属于演出宣传推广的常用渠道？',
    options: ['社交媒体', '户外广告', '内部文件', '新闻发布会'],
    answer: 2,
    explanation: '演出宣传推广渠道包括社交媒体、户外广告、新闻发布会、票务平台等，内部文件不属于宣传推广渠道。',
  },
  {
    id: 25,
    chapter: 3,
    content: '演出项目可行性分析的核心要素不包括下列哪项？',
    options: ['市场需求分析', '成本收益预测', '竞争对手私人信息', '风险评估'],
    answer: 2,
    explanation: '可行性分析核心要素包括市场需求分析、成本收益预测、风险评估等，不包括获取竞争对手私人信息。',
  },
  {
    id: 26,
    chapter: 3,
    content: '演出现场管理中，以下哪项是最优先考虑的事项？',
    options: ['节目效果', '观众安全', '成本控制', '媒体报道'],
    answer: 1,
    explanation: '演出现场管理中，观众安全始终是最优先考虑的事项，任何情况下都不能以牺牲安全为代价。',
  },
  {
    id: 27,
    chapter: 3,
    content: '演出经纪合同中，以下哪项不是必备条款？',
    options: ['演出时间和地点', '演出报酬', '赠送礼品', '违约责任'],
    answer: 2,
    explanation: '演出合同必备条款包括演出时间地点、报酬、违约责任、双方权利义务等，赠送礼品不属于必备条款。',
  },
  {
    id: 28,
    chapter: 3,
    content: '演出经纪人进行商业谈判时，最重要的准备工作是什么？',
    options: ['选择高档谈判场所', '充分了解对方信息和市场行情', '准备精美的名片', '邀请更多人参加'],
    answer: 1,
    explanation: '充分了解对方信息和市场行情是谈判最重要的准备工作，有助于在谈判中掌握主动权。',
  },
  {
    id: 29,
    chapter: 3,
    content: '演出项目评估中，衡量演出经济效益的最直接指标是什么？',
    options: ['观众满意度', '媒体曝光量', '投入产出比', '参演人数'],
    answer: 2,
    explanation: '投入产出比是衡量演出经济效益最直接的指标，反映了演出投资的回报率。',
  },
  {
    id: 30,
    chapter: 3,
    content: '演出合同发生纠纷时，首选的解决方式是什么？',
    options: ['提起诉讼', '协商解决', '媒体曝光', '行政投诉'],
    answer: 1,
    explanation: '合同纠纷首选协商解决，成本最低且有助于维护双方合作关系。协商不成再考虑调解、仲裁或诉讼。',
  },

  // ── Chapter 4: 安全管理 ──
  {
    id: 31,
    chapter: 4,
    content: '大型营业性演出活动的安全工作方案应当在演出日期多少天前报公安部门审批？',
    options: ['5天', '10天', '15天', '20天'],
    answer: 3,
    explanation: '大型营业性演出活动的安全工作方案应在演出日期20天前报当地公安机关审批。',
  },
  {
    id: 32,
    chapter: 4,
    content: '演出场所安全出口的数量和宽度应当符合什么要求？',
    options: ['企业自行确定', '行业推荐标准', '国家安全标准', '场所所有者要求'],
    answer: 2,
    explanation: '演出场所安全出口的数量和宽度必须符合国家安全标准和消防技术规范的要求。',
  },
  {
    id: 33,
    chapter: 4,
    content: '演出活动中发现火灾隐患，以下做法正确的是？',
    options: ['演出结束后再处理', '立即采取措施消除隐患', '报告后继续演出', '通知观众自行注意'],
    answer: 1,
    explanation: '发现火灾隐患应立即采取措施消除，必要时停止演出并组织人员疏散，安全始终是第一位的。',
  },
  {
    id: 34,
    chapter: 4,
    content: '演出现场观众人数超过核定容量时，应采取什么措施？',
    options: ['增加工作人员', '立即停止入场并进行疏导', '扩大场地范围', '提高票价'],
    answer: 1,
    explanation: '观众人数超过核定容量时应立即停止入场并进行疏导，防止因人员过度聚集造成安全事故。',
  },
  {
    id: 35,
    chapter: 4,
    content: '下列关于演出安全责任制的说法，正确的是？',
    options: [
      '安全责任仅由保安公司承担',
      '演出举办方是安全工作第一责任人',
      '安全责任由观众自行承担',
      '安全责任仅由场馆方承担',
    ],
    answer: 1,
    explanation: '演出举办方是演出安全工作的第一责任人，应建立安全责任制，确保各环节安全可控。',
  },
  {
    id: 36,
    chapter: 4,
    content: '大型演出活动应急预案的编制主体是？',
    options: ['公安机关', '消防部门', '演出举办单位', '物业管理公司'],
    answer: 2,
    explanation: '大型演出活动的应急预案应由演出举办单位负责编制，并报相关部门备案。',
  },
  {
    id: 37,
    chapter: 4,
    content: '演出场所从业人员消防安全培训应达到什么要求？',
    options: [
      '仅管理层人员参加',
      '全员培训并定期演练',
      '自愿参加即可',
      '由消防部门全权负责',
    ],
    answer: 1,
    explanation: '演出场所应对全体从业人员进行消防安全培训，并定期组织演练，确保人人掌握基本消防技能。',
  },
  {
    id: 38,
    chapter: 4,
    content: '演出场所的疏散通道和安全出口必须保持什么状态？',
    options: ['演出时可临时关闭', '畅通无阻', '部分开放即可', '由场馆自行决定'],
    answer: 1,
    explanation: '演出场所的疏散通道和安全出口在任何时候都必须保持畅通无阻，严禁堵塞、封闭或占用。',
  },
  {
    id: 39,
    chapter: 4,
    content: '演出中发生安全事故，演出举办单位应在多长时间内向有关部门报告？',
    options: ['24小时内', '1小时内', '事故处理完毕后', '下一个工作日'],
    answer: 1,
    explanation: '发生安全事故后，演出举办单位应在1小时内向事故发生地的县级以上人民政府有关部门报告。',
  },
  {
    id: 40,
    chapter: 4,
    content: '演出场所经营单位应当定期检查消防设施、器材，确保其处于什么状态？',
    options: ['外观完好', '正常使用状态', '有标识即可', '数量充足'],
    answer: 1,
    explanation: '演出场所应定期检查维护消防设施器材，确保其处于正常使用状态，能在紧急情况下有效使用。',
  },
];

// 小程序主包/分包体积限制严格（单包 2MB），超大自动题库仅在 H5 端启用。
let platformAutoQuestions: Question[] = [];
if (process.env.TARO_ENV !== 'weapp') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  platformAutoQuestions = require('./questions.auto').autoQuestions as Question[];
}

const AUTO_START_ID = 118;
const FULL_QUESTION_BANK_URL =
  'https://raw.githubusercontent.com/anyajg/impresario/main/src/data/questions.auto.json';
export const TRIAL_QUESTION_LIMIT = 30;

export const questions: Question[] = [
  ...baseQuestions,
  ...importedQuestions,
  ...platformAutoQuestions,
];

type AutoJsonRoot = {
  version: number;
  count: number;
  items: Array<{
    chapter: number;
    type: 'single' | 'multi';
    content: string;
    options: string[];
    answer: number | number[];
    explanation: string;
    source: string;
  }>;
};

let fullBankLoaded = process.env.TARO_ENV !== 'weapp' || platformAutoQuestions.length > 0;
let loadingPromise: Promise<boolean> | null = null;

function mapAutoItemsToQuestions(root: AutoJsonRoot): Question[] {
  return root.items.map((it, i) => ({
    id: AUTO_START_ID + i,
    chapter: it.chapter,
    ...(it.type === 'multi' ? { type: 'multi' as const } : {}),
    content: it.content,
    options: it.options,
    answer: it.answer,
    explanation: it.explanation.includes('【来源】')
      ? it.explanation
      : `${it.explanation}\n\n【来源】${it.source}`,
  }));
}

function mergeQuestionBank(auto: Question[]) {
  questions.splice(
    0,
    questions.length,
    ...baseQuestions,
    ...importedQuestions,
    ...auto
  );
}

function getAccessibleQuestions(): Question[] {
  if (isInviteUnlocked()) return questions;
  return questions.slice(0, Math.min(TRIAL_QUESTION_LIMIT, questions.length));
}

export function getAvailableQuestionCount(): number {
  return getAccessibleQuestions().length;
}

export async function ensureFullQuestionBankLoaded(): Promise<boolean> {
  if (fullBankLoaded) return true;
  if (process.env.TARO_ENV !== 'weapp') return true;
  if (!isInviteUnlocked()) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve) => {
    Taro.request({
      url: FULL_QUESTION_BANK_URL,
      method: 'GET',
      timeout: 15000,
      success(res) {
        try {
          const root = res.data as AutoJsonRoot;
          if (!root?.items?.length) {
            resolve(false);
            return;
          }
          const auto = mapAutoItemsToQuestions(root);
          mergeQuestionBank(auto);
          fullBankLoaded = true;
          resolve(true);
        } catch {
          resolve(false);
        }
      },
      fail() {
        resolve(false);
      },
      complete() {
        loadingPromise = null;
      },
    });
  });

  return loadingPromise;
}

export function getQuestionsByChapter(chapterId: number): Question[] {
  return getAccessibleQuestions().filter((q) => q.chapter === chapterId);
}

export function getQuestionById(id: number): Question | undefined {
  return getAccessibleQuestions().find((q) => q.id === id);
}

export function getRandomQuestions(count: number): Question[] {
  const arr = [...getAccessibleQuestions()];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}
