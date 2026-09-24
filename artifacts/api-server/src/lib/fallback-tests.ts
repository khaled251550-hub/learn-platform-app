export type FallbackInput = {
  type: "lesson" | "homework" | "exam" | "qiyas";
  subject: string;
  grade: string;
  topic?: string;
  fallbackTestNumber?: number;
};

type FallbackItem = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  skill: string;
  difficulty: "سهل" | "متوسط" | "صعب";
};

export const FALLBACK_TESTS_PER_SECTION = 20;
export const FALLBACK_QUESTIONS_PER_TEST = 30;

const sectionNames: Record<FallbackInput["type"], string> = {
  lesson: "اختبار الدرس",
  homework: "اختبار مشابه للواجب",
  exam: "الاختبار الشامل",
  qiyas: "اختبار قياس",
};

const difficulties: FallbackItem["difficulty"][] = ["سهل", "متوسط", "صعب"];

function testNumber(value?: number) {
  const parsed = Number.isFinite(value) ? Math.trunc(value as number) : 1;
  return Math.min(FALLBACK_TESTS_PER_SECTION, Math.max(1, parsed));
}

function difficulty(index: number) {
  return difficulties[index % difficulties.length];
}

function options(answer: string, alternatives: string[]) {
  const unique = [...new Set([answer, ...alternatives])].slice(0, 4);
  return unique.length === 4 ? unique : [...unique, "لا ينطبق على المعطيات"].slice(0, 4);
}

function arithmeticQuestion(index: number, test: number, subject: string, topic: string): FallbackItem {
  const a = 8 + ((test * 7 + index * 3) % 42);
  const b = 3 + ((test * 5 + index * 2) % 24);
  const operation = index % 4;
  const answerNumber = operation === 0 ? a + b : operation === 1 ? a - b : operation === 2 ? a * b : a + b * 2;
  const symbol = operation === 0 ? "+" : operation === 1 ? "−" : operation === 2 ? "×" : "× 2 ثم +";
  const answer = String(answerNumber);
  const alternatives = [String(answerNumber + 1), String(answerNumber - 1), String(Math.max(0, answerNumber + 4))];
  return {
    question: `في مادة ${subject}، إذا كانت المسألة من موضوع «${topic}»: احسب ${a} ${symbol} ${operation === 3 ? b : operation === 2 ? b : b}.`,
    options: options(answer, alternatives),
    answer,
    explanation: operation === 3
      ? `نطبق الضرب أولاً: ${b} × 2 = ${b * 2}، ثم نضيف ${a} فنحصل على ${answer}.`
      : `نطبق العملية ${symbol} على العددين ${a} و${b}، والناتج الصحيح هو ${answer}.`,
    skill: "الحساب والتحقق من الناتج",
    difficulty: difficulty(index + test),
  };
}

function lessonItem(index: number, test: number, input: FallbackInput): FallbackItem {
  const topic = input.topic || "المفهوم الأساسي في الدرس";
  const cards = [
    ["ما الخطوة الأولى لفهم موضوع الدرس؟", "تحديد المعطيات والمطلوب", ["حفظ الإجابة فقط", "تجاهل المصطلحات", "اختيار أطول حل"]],
    ["ما الطريقة الأفضل لتثبيت الفكرة الجديدة؟", "حل مثال ثم تفسير خطواته", ["قراءة العنوان فقط", "نسخ السؤال دون حل", "تغيير المطلوب"]],
    ["عند ظهور نتيجة غير منطقية، ماذا تفعل؟", "تراجع الوحدات والخطوات الحسابية", ["تعتمد النتيجة مباشرة", "تحذف المعطيات", "تبدل السؤال"]],
    ["ما الذي يوضح العلاقة بين المفاهيم؟", "ربط التعريف بالمثال والتطبيق", ["حفظ الكلمات منفصلة", "ترك المثال", "إلغاء المقارنة"]],
    ["كيف تتحقق من إجابتك؟", "تقارنها بالمطلوب وتعيد التعويض", ["تقرأها بسرعة", "تختار عشوائياً", "تتركها بلا مراجعة"]],
    ["ما فائدة تقسيم المسألة إلى خطوات؟", "تقليل الخطأ وتوضيح طريقة التفكير", ["زيادة الغموض", "إخفاء المعطيات", "إلغاء التحقق"]],
  ] as const;
  const [prompt, answer, alternatives] = cards[(index + test) % cards.length];
  return {
    question: `في درس «${topic}» لمادة ${input.subject}: ${prompt}`,
    options: options(answer, [...alternatives]),
    answer,
    explanation: `الإجابة الصحيحة هي «${answer}» لأنها تربط مفهوم الدرس بالتطبيق والمراجعة، وليس بالحفظ المنفصل.`,
    skill: "فهم المفهوم وتطبيقه",
    difficulty: difficulty(index + test),
  };
}

function homeworkItem(index: number, test: number, input: FallbackInput): FallbackItem {
  if (index % 3 === 0) return arithmeticQuestion(index, test, input.subject, input.topic || "المهارة المصورة");
  const cards = [
    ["ما أول معلومة يجب استخراجها من صورة الواجب؟", "المعطيات والقيمة المطلوبة", ["لون الصفحة", "رقم السؤال فقط", "اسم الملف"]],
    ["إذا اختلفت وحدات القياس، ما الإجراء الصحيح؟", "توحيد الوحدات قبل الحساب", ["جمعها مباشرة", "حذف الوحدة", "تقريبها عشوائياً"]],
    ["ما أفضل طريقة لمراجعة حل الواجب؟", "إعادة الحل ثم مقارنة النتيجة", ["حفظ النتيجة", "ترك الخطوة الأخيرة", "تغيير المعطيات"]],
    ["ماذا تفعل إذا كانت الصورة غير واضحة؟", "تطلب صورة أوضح ولا تخمّن المعطى", ["تخترع قيمة", "تتجاهل السؤال", "تنسخ الإجابة"]],
  ] as const;
  const [prompt, answer, alternatives] = cards[(index + test) % cards.length];
  return {
    question: `تدريب مشابه للواجب في ${input.subject}: ${prompt}`,
    options: options(answer, [...alternatives]),
    answer,
    explanation: `نبدأ بتحديد المطلوب والمعطيات، ثم نطبق القاعدة المناسبة ونراجع الناتج قبل اعتماده.`,
    skill: "تحليل المسألة والتحقق",
    difficulty: difficulty(index + test),
  };
}

function examItem(index: number, test: number, input: FallbackInput): FallbackItem {
  const subject = input.subject === "جميع المواد"
    ? ["الرياضيات", "العلوم", "اللغة العربية", "اللغة الإنجليزية"][index % 4]
    : input.subject;
  if (index % 2 === 0) return arithmeticQuestion(index, test, subject, input.topic || "المراجعة الشاملة");
  const cards = [
    ["ما العنصر المشترك في الإجابة الجيدة؟", "تستند إلى معطيات السؤال", ["تطيل الكلام", "تتجاهل المطلوب", "تكرر الخيارات"]],
    ["ما مهارة القراءة التي تساعد في السؤال الطويل؟", "استخراج الفكرة والمعطيات الرئيسة", ["قراءة آخر كلمة فقط", "حذف الفقرة", "اختيار أول خيار"]],
    ["متى تستخدم التقدير؟", "عندما يطلب السؤال قيمة تقريبية", ["في كل سؤال", "بدلاً من قراءة المعطيات", "بعد حذف الوحدات"]],
    ["ما أفضل ترتيب لإدارة اختبار شامل؟", "حل السهل ثم العودة للأصعب", ["التوقف عند أول سؤال", "ترك الوقت بلا خطة", "اختيار الإجابات عشوائياً"]],
  ] as const;
  const [prompt, answer, alternatives] = cards[(index + test) % cards.length];
  return {
    question: `في مراجعة ${subject}: ${prompt}`,
    options: options(answer, [...alternatives]),
    answer,
    explanation: `نختار «${answer}» لأنها تعتمد على فهم المطلوب وإدارة خطوات الحل، وهي مهارة قابلة للتطبيق في الاختبارات الشاملة.`,
    skill: "المراجعة وإدارة الوقت",
    difficulty: difficulty(index + test),
  };
}

function qiyasItem(index: number, test: number, input: FallbackInput): FallbackItem {
  const achievement = input.subject === "التحصيلي";
  if (!achievement && index % 2 === 0) {
    const start = 2 + ((test + index) % 8);
    const step = 2 + ((test * 2 + index) % 5);
    const answer = String(start + step * 3);
    return {
      question: `قدرات كمي: ما العدد التالي في النمط ${start}، ${start + step}، ${start + step * 2}، ...؟`,
      options: options(answer, [String(Number(answer) + 1), String(Number(answer) - 2), String(start + step * 4 + 1)]),
      answer,
      explanation: `الفرق ثابت ويساوي ${step}، لذلك نضيفه ثلاث مرات إلى الحد الأول للوصول إلى ${answer}.`,
      skill: "اكتشاف النمط العددي",
      difficulty: difficulty(index + test),
    };
  }
  const cards = achievement
    ? [
        ["ما الذي يحول الطاقة في الخلية إلى صورة قابلة للاستخدام؟", "التفاعلات الحيوية المنظمة", ["اللون فقط", "الحرارة الخارجية", "تغيير الاسم"]],
        ["ما دور المتغير المستقل في التجربة؟", "يغيره الباحث لقياس أثره", ["لا يتغير أبداً", "يمثل النتيجة دائماً", "يحذف من التجربة"]],
        ["ما الخطوة الأولى في تفسير نتيجة علمية؟", "وصف البيانات كما ظهرت", ["تغيير البيانات", "تجاهل المحور", "اختيار نتيجة مسبقة"]],
        ["لماذا تستخدم الوحدات في القياس؟", "لتحديد مقدار الكمية بدقة", ["لتزيين الإجابة", "لإخفاء الرقم", "لا علاقة لها بالحساب"]],
      ]
    : [
        ["العلاقة بين الكتاب والقراءة تشبه العلاقة بين القلم و...", "الكتابة", ["النوم", "الطعام", "الطريق"]],
        ["أكمل: من جدّ ...", "وجد", ["نام", "ابتعد", "تأخر"]],
        ["ما الكلمة المختلفة سياقياً؟", "تفاحة", ["قلم", "دفتر", "كتاب"]],
        ["إذا كان كل الطلاب متعلمين وبعض المتعلمين رياضيين، فما المؤكد؟", "كل الطلاب متعلمون", ["كل الطلاب رياضيون", "لا أحد متعلم", "كل الرياضيين طلاب"]],
      ];
  const [prompt, answer, alternatives] = cards[(index + test) % cards.length] as unknown as readonly [string, string, string[]];
  return {
    question: `${achievement ? "تحصيلي" : "قدرات لفظي"}: ${prompt}`,
    options: options(answer, alternatives),
    answer,
    explanation: `الإجابة الصحيحة هي «${answer}» لأنها تحقق العلاقة أو القاعدة المطلوبة دون افتراضات إضافية.`,
    skill: achievement ? "فهم المفاهيم العلمية" : "الاستدلال اللفظي",
    difficulty: difficulty(index + test),
  };
}

function makeItem(index: number, test: number, input: FallbackInput) {
  if (input.type === "lesson") return lessonItem(index, test, input);
  if (input.type === "homework") return homeworkItem(index, test, input);
  if (input.type === "qiyas") return qiyasItem(index, test, input);
  return examItem(index, test, input);
}

export function getFallbackTest(input: FallbackInput) {
  const selectedTest = testNumber(input.fallbackTestNumber);
  const topic = input.topic || "المراجعة العامة";
  const items = Array.from({ length: FALLBACK_QUESTIONS_PER_TEST }, (_, index) => makeItem(index, selectedTest, input));
  return {
    title: `${sectionNames[input.type]} ${selectedTest} — ${input.subject}`,
    body: `هذا اختبار جاهز من مخزون لنتعلم الاحتياطي. يحتوي على ${FALLBACK_QUESTIONS_PER_TEST} سؤالاً، وهو النموذج ${selectedTest} من أصل ${FALLBACK_TESTS_PER_SECTION} نموذجاً في قسم ${sectionNames[input.type]}. الموضوع: ${topic}.`,
    items,
    source: "fallback" as const,
    testNumber: selectedTest,
    testsAvailable: FALLBACK_TESTS_PER_SECTION,
    questionsPerTest: FALLBACK_QUESTIONS_PER_TEST,
  };
}