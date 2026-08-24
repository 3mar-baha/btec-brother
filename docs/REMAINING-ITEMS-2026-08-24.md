# تقرير المتبقي — متابعة مسح 2026-08-24

**آخر تحديث:** 2026-08-24 (جلسة التنفيذ الثانية) · يكمّل: `AUDIT-REPORT-2026-08-24.md`

---

## ما أُنجز في جلسة اليوم

| Commit | المحتوى |
|---|---|
| `8037391` | الإصلاحات الـ17 الأصلية (telegram relay, RLS, RPC guards, frontend error handling) + إصلاح `FOR UPDATE` على استعلام تجميعي في `settle_payout` كان سيُفشل الترحيل |
| `fe86d3b` | حذف المكتبات الميتة الست (صفر استيرادات مؤكد) |
| `a3c89da` | الإصلاحات الأربعة LOW (busy-state للعضو، حقول الفئات، فلتر الأعضاء realtime، مفتاح React) |
| `5163a56` | `getCurrentProfile` يرمي عند الفشل + error boundaries عربية بدل التدهور الصامت ل worker (كان الأدمين يُقذف من /admin عند أي خطأ عابر) |
| `096cbc6` | إزالة منح الأدمينة تلقائياً بالبريد الصلب من `handle_new_user` + توثيق SQL الـbootstrap |

## قرارات اعتُمدت اليوم وتنفّذت

1. ✅ **الأدمينة:** لا منح تلقائي بالبريد — التزويد يدوي بـ SQL موثق (في رأس الترحيل وفي schema.sql).
2. ✅ **Next.js:** كنا أصلاً على أحدث patch في خط 14.2.x (`14.2.35` = آخر إصدار في dist-tag `next-14`). الخط أُنهي من أوبستريم؛ سد الثغرات يتطلب ترقية major (انظر المتبقي).
3. ✅ **أخطاء الملف الشخصي:** صفحة خطأ عربية مع «إعادة المحاولة / تسجيل الدخول» بدل السقوط الصامت.

---

# المتبقي المفتوح

## 👤 أ. على المالك فقط (لا يمكن للوكيل تنفيذها)

### 1. تدوير أكواد الاسترداد — 🟠 عالية
`recovery-codes.txt` قابلة الاسترجاع من commit `ca367b0`، **والملف موجود فعلياً على القرص المحلي** (مُستثنى بالـ .gitignore منذ `3d4782d` لكنه في التاريخ).
- [ ] دوّر الأكواد من مصدرها (هذا وحده يحيّد الخطر)
- [ ] اختياري بعدها: `git filter-repo --path recovery-codes.txt --invert-paths` + force-push (تدميري — يعيد كتابة التاريخ لكل المتعاونين)

### 2. كلمات مرور seed العلنية — 🟠 عالية
`Password123!` في المستودع لكل حسابات seed ومنها الأدمين.
- [ ] غيّر كلمة مرور admin@btechub.app في Supabase Auth (staging + prod)
- [ ] غيّر أي حساب آخر ما زال عليها

### 3. تطبيق الترحيلين — 🟠 عالية (بدونهما لا تسري إصلاحات DB)
```bash
psql "$DATABASE_URL" -f supabase/migrations/security_hardening.sql
psql "$DATABASE_URL" -f supabase/migrations/remove_hardcoded_admin_bootstrap.sql
```
فحوصات قبل التطبيق:
```sql
SELECT email FROM users WHERE role='admin' AND (NOT is_approved OR NOT is_active);
SELECT telegram_chat_id, count(*) FROM users
WHERE telegram_chat_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
```
بعد التطبيق: تحقق أن الأدمين ما زال أدميناً (`select email, role from users where role='admin';`)، ثم smoke test: حجز → تسليم → اعتماد → رسالة Telegram بين طرفَي نفس الطلب.
ملاحظة: بعد ترحيل `remove_hardcoded_admin_bootstrap.sql` لن يصبح المسجل بالبريد admin@btechub.app أدميناً تلقائياً — إن كنت تعتمد على ذلك في بيئة جديدة استخدم SQL الـbootstrap الموثق.

### 4. مفاتيح Vercel السبعة — 🟡 متوسطة
تأكد أنها مضبوطة في Project Settings لكل بيئة:
`NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID` · `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` · `NEXT_PUBLIC_TELEGRAM_BOT_ID`
(سر الـwebhook مشتق تلقائياً من bot token — لا يحتاج متغيراً منفصلاً.)

---

## 💬 ب. قرارات لم تُحسم بعد (تحتاج رأيك)

### 5. ترقية Next.js major — 🟡 متوسطة ⭐ القرار الأهم المتبقي
14.2.35 هو آخر إصدار في الخط وأُنهي ديسمبر 2025؛ الثغرات المكتشفة بعده لا تُرقَّع عليه. الوجهات:
- **15.5.x** (dist-tag `backport` = 15.5.23): خط صيانة يستقبل رقعاً أمنية backport — أقصر طريق
- **16.x** (latest = 16.3.2): الأحدث كاملاً
التغييرات الكبرى في 15+: `cookies()/headers()` صارت async، تغييرات middleware، سلوك caching — يمس عدداً من ملفات المشروع. جلسة مخصصة (~نصف يوم) مع e2e suite الحالي كشبكة أمان.

### 6. Rate limiting — 🟡 متوسطة
ما زال `/api/auth/register` و`/api/telegram` بلا حد. التوصية السابقة قائمة: Upstash Redis + `@upstash/ratelimit` (خطة مجانية، ~ساعة عمل). أو قبول المخاطرة مؤقتاً إن كان الاستخدام محدوداً.

### 7. تشديد `GRANT ALL … TO anon` — 🟢 منخفضة
مراجعة دالة-بدالة لإلغاء EXECUTE/TRUNCATE غير الضرورية (~ساعة ونصف مع اختبار). يُفضَّل بعد تطبيق الترحيلات واستقرار الإنتاج.

---

## ✅ c. مغلق من بنود الجلسة الأولى
- ~~المكتبات الميتة الست~~ → `fe86d3b`
- ~~الإصلاحات الأربعة LOW~~ → `a3c89da`
- ~~سلوك getCurrentProfile الصامت~~ → `5163a56` (قرارك نُفّذ)
- ~~البريد الصلب للأدمينة~~ → `096cbc6` (قرارك نُفّذ)
