import { Router, type IRouter } from "express";
import {
  CreateCatalogItemBody,
  CreateCatalogItemResponse,
  GetCatalogResponse,
  GetLessonParams,
  GetLessonResponse,
  GetSettingsResponse,
  GetSubscriptionResponse,
  LoginBody,
  RegisterBody,
  SubmitSubscriptionBody,
  UpdateSettingsBody,
  UpdateSubscriptionStatusBody,
  UpdateSubscriptionStatusParams,
} from "@workspace/api-zod";

type SubscriptionStatus = "none" | "pending" | "active" | "rejected" | "expired";
type User = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  subscriptionStatus: SubscriptionStatus;
};
type Subscription = {
  id: string;
  user: User;
  status: Exclude<SubscriptionStatus, "none">;
  plan: "monthly" | "yearly";
  amount: number;
  receiptName: string | null;
  submittedAt: string;
};

const router: IRouter = Router();
const users: User[] = [];
const subscriptions: Subscription[] = [];
let currentUser: User | null = null;
let settings = {
  monthlyPrice: 30,
  yearlyPrice: 299,
  bankName: "Urpay",
  accountName: "خالد العتيبي",
  iban: "SA7280206153985222121018",
};

const demoCatalog = {
  stages: [
    {
      id: "primary",
      name: "المرحلة الابتدائية",
      description: "أساس قوي يبدأ من الفضول وينمو بالثقة.",
      color: "#e6a536",
      grades: [
        {
          id: "p4",
          name: "الصف الرابع",
          subjects: [
            {
              id: "math-p4",
              name: "الرياضيات",
              icon: "∑",
              lessonCount: 24,
              sections: [
                { id: "p4-e", type: "explanations", title: "شرح الدروس", count: 24 },
                { id: "p4-h", type: "homework", title: "الواجبات", count: 18 },
                { id: "p4-x", type: "exams", title: "الاختبارات", count: 12 },
                { id: "p4-q", type: "qiyas", title: "تدريب قياس", count: 8 },
              ],
            },
            { id: "arabic-p4", name: "لغتي الجميلة", icon: "ع", lessonCount: 19, sections: [] },
          ],
        },
        { id: "p6", name: "الصف السادس", subjects: [{ id: "science-p6", name: "العلوم", icon: "ع", lessonCount: 28, sections: [] }] },
      ],
    },
    {
      id: "middle",
      name: "المرحلة المتوسطة",
      description: "فهم أعمق، أسئلة أذكى، وخطوة أقرب لهدفك.",
      color: "#2e8a78",
      grades: [
        { id: "m1", name: "الأول المتوسط", subjects: [{ id: "math-m1", name: "الرياضيات", icon: "∑", lessonCount: 34, sections: [] }] },
        { id: "m3", name: "الثالث المتوسط", subjects: [{ id: "science-m3", name: "العلوم", icon: "ع", lessonCount: 27, sections: [] }] },
      ],
    },
    {
      id: "secondary",
      name: "المرحلة الثانوية",
      description: "استعداد مركز للمدرسة والقدرات والجامعة.",
      color: "#36738a",
      grades: [
        { id: "s1", name: "الأول الثانوي", subjects: [{ id: "math-s1", name: "رياضيات 1", icon: "∑", lessonCount: 36, sections: [] }] },
        { id: "s2", name: "الثاني الثانوي", subjects: [{ id: "math-s2", name: "رياضيات 2", icon: "∑", lessonCount: 46, sections: [] }] },
        { id: "s3", name: "الثالث الثانوي", subjects: [{ id: "qiyas-s3", name: "القدرات والتحصيلي", icon: "ق", lessonCount: 55, sections: [] }] },
      ],
    },
  ],
};

const adminEmail = process.env.ADMIN_EMAIL ?? "Kmskms653@gmail.com";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Ka11223344";

export function hasActiveSubscription() {
  return Boolean(currentUser?.isAdmin || currentUser?.subscriptionStatus === "active");
}

export function hasAdminSession() {
  return Boolean(currentUser?.isAdmin);
}

function requireActiveSubscription(res: any) {
  if (!currentUser) {
    res.status(401).json({ error: "سجّل الدخول أولاً للوصول إلى محتوى المنصة." });
    return false;
  }
  if (!hasActiveSubscription()) {
    res.status(402).json({ error: "يتطلب هذا المحتوى اشتراكاً فعالاً." });
    return false;
  }
  return true;
}

function requireAdmin(res: any) {
  if (!currentUser) {
    res.status(401).json({ error: "سجّل الدخول أولاً." });
    return false;
  }
  if (!hasAdminSession()) {
    res.status(403).json({ error: "لا تملك صلاحية الوصول إلى لوحة الإدارة." });
    return false;
  }
  return true;
}

function responseUser(user: User) {
  return { ...user };
}

function getOrCreateAdmin() {
  const existing = users.find((item) => item.email.toLowerCase() === adminEmail.toLowerCase());
  if (existing) return existing;
  const admin: User = {
    id: "admin-khaled",
    name: "خالد العتيبي",
    email: adminEmail,
    isAdmin: true,
    subscriptionStatus: "active",
  };
  users.push(admin);
  return admin;
}

router.get("/auth/session", (_req, res) => {
  if (!currentUser) {
    res.status(401).json({ error: "لا توجد جلسة نشطة." });
    return;
  }
  res.json({ user: responseUser(currentUser) });
});

router.post("/auth/register", (req, res) => {
  const input = RegisterBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "بيانات التسجيل غير صحيحة." });
    return;
  }
  const existing = users.find((item) => item.email.toLowerCase() === input.data.email.toLowerCase());
  if (existing) {
    res.status(409).json({ error: "البريد الإلكتروني مستخدم مسبقاً." });
    return;
  }
  const user: User = {
    id: `user-${users.length + 1}`,
    name: input.data.name,
    email: input.data.email,
    isAdmin: false,
    subscriptionStatus: "none",
  };
  users.push(user);
  currentUser = user;
  res.status(201).json({ user: responseUser(user) });
});

router.post("/auth/login", (req, res) => {
  const input = LoginBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "بيانات الدخول غير صحيحة." });
    return;
  }
  if (input.data.email.toLowerCase() === adminEmail.toLowerCase() && input.data.password === adminPassword) {
    currentUser = getOrCreateAdmin();
    res.json({ user: responseUser(currentUser) });
    return;
  }
  const user = users.find((item) => item.email.toLowerCase() === input.data.email.toLowerCase());
  if (!user || input.data.password.length < 8) {
    res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
    return;
  }
  currentUser = user;
  res.json({ user: responseUser(user) });
});

router.get("/catalog", (_req, res) => {
  res.json(GetCatalogResponse.parse(demoCatalog));
});

router.get("/catalog/lessons/:lessonId", (req, res) => {
  const params = GetLessonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "معرّف الدرس غير صحيح." });
    return;
  }
  if (!requireActiveSubscription(res)) return;
  const unlocked = true;
  const lesson = {
    id: params.data.lessonId,
    title: "المتجهات في المستوى",
    subjectName: "رياضيات 2",
    content: "نتعلم في هذا الدرس تمثيل المتجهات، جمعها، وتحليلها إلى خطوات واضحة مع أمثلة تطبيقية.",
    locked: !unlocked,
  };
  res.json(GetLessonResponse.parse(lesson));
});

router.get("/subscriptions", (_req, res) => {
  const own = currentUser && subscriptions.find((item) => item.user.id === currentUser?.id);
  res.json(GetSubscriptionResponse.parse(own ? own : {
    status: currentUser?.subscriptionStatus ?? "none",
    plan: "monthly",
    amount: settings.monthlyPrice,
    receiptName: null,
    submittedAt: null,
  }));
});

router.post("/subscriptions", (req, res) => {
  const input = SubmitSubscriptionBody.safeParse(req.body);
  if (!input.success || !currentUser) {
    res.status(400).json({ error: "سجّل الدخول وأكمل بيانات الاشتراك." });
    return;
  }
  const amount = input.data.plan === "yearly" ? settings.yearlyPrice : settings.monthlyPrice;
  const subscription: Subscription = {
    id: `subscription-${subscriptions.length + 1}`,
    user: currentUser,
    status: "pending",
    plan: input.data.plan,
    amount,
    receiptName: input.data.receiptName,
    submittedAt: new Date().toISOString(),
  };
  subscriptions.push(subscription);
  currentUser.subscriptionStatus = "pending";
  res.status(201).json(GetSubscriptionResponse.parse(subscription));
});

router.get("/admin/overview", (_req, res) => {
  if (!requireAdmin(res)) return;
  const active = subscriptions.filter((item) => item.status === "active").length;
  const pending = subscriptions.filter((item) => item.status === "pending").length;
  res.json({ students: Math.max(users.length, 1), activeSubscriptions: active, pendingRequests: pending, lessons: 684 });
});

router.get("/admin/subscriptions", (_req, res) => {
  if (!requireAdmin(res)) return;
  res.json(subscriptions);
});

router.patch("/admin/subscriptions/:subscriptionId/status", (req, res) => {
  if (!requireAdmin(res)) return;
  const params = UpdateSubscriptionStatusParams.safeParse(req.params);
  const input = UpdateSubscriptionStatusBody.safeParse(req.body);
  if (!params.success || !input.success) {
    res.status(400).json({ error: "بيانات الحالة غير صحيحة." });
    return;
  }
  const subscription = subscriptions.find((item) => item.id === params.data.subscriptionId);
  if (!subscription) {
    res.status(404).json({ error: "طلب الاشتراك غير موجود." });
    return;
  }
  subscription.status = input.data.status;
  subscription.user.subscriptionStatus = input.data.status;
  res.json(GetSubscriptionResponse.parse(subscription));
});

router.post("/admin/catalog", (req, res) => {
  if (!requireAdmin(res)) return;
  const input = CreateCatalogItemBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "بيانات المحتوى غير صحيحة." });
    return;
  }
  res.status(201).json(CreateCatalogItemResponse.parse({
    ...input.data,
    id: `catalog-${Date.now()}`,
  }));
});

router.get("/admin/settings", (_req, res) => {
  if (!requireAdmin(res)) return;
  res.json(GetSettingsResponse.parse(settings));
});

router.patch("/admin/settings", (req, res) => {
  if (!requireAdmin(res)) return;
  const input = UpdateSettingsBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "بيانات الإعدادات غير صحيحة." });
    return;
  }
  settings = input.data;
  res.json(GetSettingsResponse.parse(settings));
});

export default router;