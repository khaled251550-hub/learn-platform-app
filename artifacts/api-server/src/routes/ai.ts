import { Router, type IRouter } from "express";
import OpenAI from "openai";
import {
  GenerateAiContentBody,
  GenerateAiContentResponse,
} from "@workspace/api-zod";
import { hasActiveSubscription } from "./platform";
import { getFallbackTest } from "../lib/fallback-tests";

const router: IRouter = Router();

const instructions = `
أنت مساعد تعليمي عربي لمنصة لنتعلم. أجب بالعربية الفصحى المبسطة المناسبة للطلاب في السعودية.
مهمتك الأساسية هي إنشاء اختبار تدريبي أصلي، وليس إعطاء إجابة عامة فقط.
قدّم شرحاً دقيقاً وخطوات قابلة للمراجعة، ولا تخترع مصادر أو نتائج.
لا تنسخ أي سؤال منشور حرفياً من الإنترنت أو من بنك أسئلة محمي بحقوق النشر.
استفد من أنماط الأسئلة العامة المنشورة لتوليد سؤال جديد بنفس المهارة ومستوى الصعوبة.
أعد JSON فقط بهذا الشكل:
{
  "title": "عنوان قصير",
  "body": "ملخص المهارات التي يقيسها الاختبار، واستراتيجية الحل، ونصيحة قصيرة للاستعداد",
  "items": [
    {
      "question": "سؤال اختيار من متعدد أصلي",
      "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      "answer": "نص الخيار الصحيح أو الناتج الصحيح",
      "explanation": "شرح طريقة التفكير خطوة بخطوة ولماذا الخيارات الأخرى غير صحيحة عند الحاجة",
      "skill": "المهارة المقاسة",
      "difficulty": "متوسط"
    }
  ]
}
اجعل items بين 5 و 8 أسئلة تدريبية، وكل سؤال له أربعة خيارات مختلفة.
إذا كان النوع lesson فأنشئ اختباراً من موضوع الدرس.
إذا كان homework فاقرأ صورة الدرس أو المعادلة أو الواجب بدقة. اشرح ما يظهر فيها خطوة بخطوة داخل body، ثم أنشئ تدريباً مشابهاً يقيس نفس الفكرة. إذا كانت الصورة غير واضحة، اذكر الجزء غير الواضح ولا تخمّن.
إذا كان exam فأنشئ اختباراً شاملاً متوازناً من المادة أو جميع المواد المطلوبة.
إذا كان qiyas وكانت المادة القدرات، فوزّع الأسئلة على القدرات اللفظية والكمية، مثل:
التناظر اللفظي، إكمال الجمل، استيعاب المقروء، الخطأ السياقي، الحساب، الجبر، الهندسة، وتفسير البيانات.
إذا كان qiyas وكانت المادة التحصيلي، فأنشئ أسئلة مفاهيم وتطبيقات أصلية من الأحياء والكيمياء والفيزياء والرياضيات للمرحلة الثانوية.
أضف داخل body استراتيجية إدارة الوقت ومراجعة الأخطاء، ووجّه الطالب إلى مراجعة المفهوم قبل حفظ الإجابة.
إذا أرسل المستخدم صورة، اقرأ المسألة الظاهرة فيها بدقة، ثم اشرح الحل خطوة بخطوة واذكر أي جزء غير واضح بدلاً من التخمين.
`;

router.post("/ai/generate", async (req, res) => {
  if (!hasActiveSubscription()) {
    res.status(402).json({
      error: "يتطلب توليد الاختبارات اشتراكاً فعالاً في لنتعلم.",
    });
    return;
  }

  const parsedInput = GenerateAiContentBody.safeParse(req.body);
  if (!parsedInput.success) {
    res.status(400).json({ error: "بيانات الطلب غير مكتملة أو غير صحيحة." });
    return;
  }

  const fallback = () => {
    const result = getFallbackTest(parsedInput.data);
    req.log.warn({ section: parsedInput.data.type, testNumber: result.testNumber }, "Using local fallback test bank");
    res.json(result);
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    fallback();
    return;
  }

  const { type, subject, grade, topic, imageData } = parsedInput.data;
  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: instructions },
        {
          role: "user",
          content: imageData
            ? [
                {
                  type: "text",
                  text: JSON.stringify({
                    type,
                    subject,
                    grade,
                    topic: topic || "حل الواجب الظاهر في الصورة وشرحه",
                  }),
                },
                { type: "image_url", image_url: { url: imageData, detail: "high" } },
              ]
            : JSON.stringify({
                type,
                subject,
                grade,
                topic: topic || "مراجعة عامة للمادة",
              }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      req.log.warn("AI provider returned an empty response");
      fallback();
      return;
    }

    const output = GenerateAiContentResponse.safeParse({ ...JSON.parse(raw), source: "ai" });
    if (!output.success) {
      req.log.warn({ issueCount: output.error.issues.length }, "AI response failed validation");
      fallback();
      return;
    }

    res.json(output.data);
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status)
      : 0;
    if (status === 429) {
      req.log.warn("AI provider has no available credits");
      fallback();
      return;
    }
    req.log.error({ err: error }, "AI generation request failed");
    fallback();
  }
});

export default router;