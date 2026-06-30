# التقرير الشامل لمشروع Interprise-OnPremShopPay

هذا التقرير يغطي بالتفصيل جميع مكونات المشروع، التقنيات المستخدمة، هيكلة الملفات (مساراتها)، ووظيفة كل مكون وكيفية عمله وتكامله مع باقي أجزاء النظام.

---

## 1. الواجهة الأمامية (Frontend)
الواجهة الأمامية هي نقطة تفاعل المستخدم مع المتجر الإلكتروني. تم تصميمها لتكون حديثة وسريعة ومتجاوبة.

* **التقنيات المستخدمة**: Next.js (React Framework)، TypeScript، Node.js.
* **المسار الرئيسي**: `/home/selcon/Downloads/Interprise-OnPremShopPay/frontend`
* **أهم الملفات**:
  * `src/app/` و `src/components/`: تحتوي على مكونات واجهة المستخدم والصفحات.
  * `next.config.js` / `next.config.mjs`: ملفات إعداد Next.js، وفيها تم تعريف الـ `rewrites` لعمل وكيل (Proxy) لطلبات الـ API وتوجيهها إلى الـ API Gateway (Kong).
  * `Dockerfile`: ملف بناء صورة الحاوية (Container Image) للواجهة الأمامية.
* **آلية العمل**: 
  الواجهة الأمامية تعمل في وضع الـ Standalone، وتستقبل طلبات المستخدمين (عبر المنفذ 3000 داخلياً). عند حاجة الواجهة الأمامية لجلب بيانات (مثل المنتجات)، تقوم بتوجيه الطلب عبر مسار الـ `/api/*` والذي بدوره يقوم بتمرير الطلب خلف الكواليس (Server-side proxy) إلى بوابة Kong لتتصل بخدمات الـ Backend. كما قمنا بحل مشكلة الـ Caching مؤخراً عن طريق عمل `emptyDir` لمجلدات `/app/.next/cache` لتفادي مشكلة الـ Read-Only Root Filesystem.

---

## 2. الخدمات الخلفية المصغرة (Backend Microservices)
النظام مبني على معمارية الخدمات المصغرة (Microservices Architecture) لضمان الاستقلالية، الأمان، وسهولة التوسع.

* **التقنيات المستخدمة**: Node.js / Express أو تقنيات مشابهة لبرمجة الخدمات، و قواعد بيانات PostgreSQL المستقلة لكل خدمة.
* **المسار الرئيسي**: `/home/selcon/Downloads/Interprise-OnPremShopPay/backend/services`
* **الخدمات المتاحة**:
  1. **خدمة المنتجات (`product-service`)**: لإدارة الكتالوج وجلب بيانات المنتجات.
  2. **خدمة الطلبات (`order-service`)**: لمعالجة طلبات الشراء.
  3. **خدمة الدفع (`payment-service`)**: للتعامل مع بوابات وعمليات الدفع.
  4. **خدمة التواصل (`contact-service`)**: لإدارة رسائل التواصل والدعم.
* **آلية العمل**:
  كل خدمة تمتلك قاعدة البيانات الخاصة بها (`PostgreSQL`) لتحقيق الـ Data Isolation. تتواصل الخدمات مع العالم الخارجي أو الواجهة الأمامية فقط وحصرياً من خلال بوابة الـ Kong Gateway. لا توجد خدمة تستطيع التحدث مع قاعدة بيانات خدمة أخرى مباشرة.

---

## 3. إدارة واجهات برمجة التطبيقات (API Gateway - Kong)
الـ API Gateway هو حارس البوابة الرئيسي للمشروع، حيث يستقبل الطلبات ويوجهها.

* **التقنيات المستخدمة**: Kong Ingress Controller.
* **المسار الرئيسي**: 
  * `/home/selcon/Downloads/Interprise-OnPremShopPay/api-gateway`
  * `/home/selcon/Downloads/Interprise-OnPremShopPay/infra/kong`
* **آلية العمل**:
  يعمل Kong كموجه (Router). على سبيل المثال، عندما يقوم الـ Frontend بإرسال طلب إلى `kong-kong-proxy/api/products`، يقوم Kong بمطابقة المسار وتوجيه الطلب داخلياً إلى خدمة `product-service` عبر منفذ الخدمة المخصص. يوفر Kong طبقة حماية، تحكم في التوجيه، وإدارة للحمل (Load Balancing).

---

## 4. إدارة البنية التحتية والتوزيع (Infrastructure & GitOps)
لأتمتة النشر وإدارة موارد Kubernetes، نستخدم ممارسات الـ GitOps والـ Helm.

* **التقنيات المستخدمة**: Helm (مدير حزم K8s)، ArgoCD (أداة GitOps).
* **المسارات الرئيسية**:
  * `/home/selcon/Downloads/Interprise-OnPremShopPay/charts/shoppay`: مجلد يحتوي على الـ Helm Chart الأساسي للمشروع (متضمن الـ Deployments, Services, ConfigMaps).
  * `/home/selcon/Downloads/Interprise-OnPremShopPay/k8s/argocd`: إعدادات ArgoCD لمزامنة التغييرات في المستودع (Git) تلقائياً مع الكلاستر.
* **آلية العمل**:
  عبر جمع جميع تعريفات الخدمات داخل الـ Helm Chart، يسهل علينا عمل `Deploy` للمشروع بالكامل بتعديل المتغيرات (`values.yaml`). أما `ArgoCD` فهو يراقب هذا الملف (أو المستودع)، وإذا وجد أنك قمت بتغيير في الكود أو الإعدادات (مثلاً تغييرنا لـ volumeMounts في الـ frontend.yaml)، يقوم ArgoCD بتطبيق التعديل مباشرة على الكلاستر (Sync) ليطابق الحالة الفعلية للـ Kubernetes مع الحالة المطلوبة في الـ Code.

---

## 5. إدارة الأسرار الأمنية (Secrets Management)
نظراً لأن المشروع مخصص للإنتاج (Production-ready)، لا يتم تخزين كلمات المرور صراحة.

* **التقنيات المستخدمة**: HashiCorp Vault، External Secrets Operator.
* **المسارات الرئيسية**:
  * `/home/selcon/Downloads/Interprise-OnPremShopPay/infra/vault`
  * `vault-secretstore.yaml` داخل الـ Helm Charts.
* **آلية العمل**:
  يعمل HashiCorp Vault كخزنة آمنة للبيانات الحساسة (مثل كلمات مرور قواعد البيانات). يتم حقن هذه الأسرار في الحاويات (Pods) باستخدام الـ Vault Agent Injector عبر الـ Annotations الموجودة في الـ Deployment. بالتالي، التطبيق يقرأ كلمة المرور من ملف الـ Secret المحقون في الذاكرة دون أن يتم كتابتها مطلقاً في الكود المصدر.

---

## 6. سياسات الشبكة والأمان (Network Policies & Security)
تُعد طبقة الـ NetworkPolicies المطبقة عبر Calico العصب الأمني للاتصالات داخل الكلاستر.

* **التقنيات المستخدمة**: Calico CNI، Kubernetes Network Policies، PodSecurity.
* **المسار الرئيسي**: `/home/selcon/Downloads/Interprise-OnPremShopPay/charts/shoppay/templates/networkpolicy-*.yaml`
* **آلية العمل**:
  المشروع يتبع مبدأ الـ **Zero Trust** و الـ **Default Deny**:
  1. كل خدمة (Namespace) مغلق عليها تماماً (Default Deny).
  2. تم إنشاء سياسات شبكة (Network Policies) دقيقة لفتح الاتصال فقط بين المكونات المصرح لها. مثال: خدمة المنتجات `product-service` غير مسموح لها بالتواصل مع الإنترنت أو مع خدمة الطلبات `order-service`، بل مسموح لها فقط باستقبال الطلبات (Ingress) من `Kong Gateway`، وإرسال الطلبات (Egress) إلى `product-postgresql` والـ Vault فقط.
  3. جميع الـ Pods تعمل بمبدأ `runAsNonRoot: true` وتمنع صلاحيات الجذر (Privilege Escalation).

---

## 7. المراقبة والتنبيه (Monitoring & Observability)
لتتبع صحة النظام واستهلاك الموارد.

* **التقنيات المستخدمة**: Prometheus، Grafana، Alertmanager، Kube-State-Metrics.
* **الآلية**:
  يتم تجميع مقاييس (Metrics) الخدمات واستهلاك الموارد (CPU/RAM) عبر Prometheus، وتُعرض عبر لوحات تحكم مرئية في Grafana. الـ Alertmanager مسؤول عن إرسال إشعارات في حال توقف إحدى الخدمات أو ارتفاع الاستهلاك بشكل غير طبيعي.

---

## 8. اختبارات الكود والتكامل المستمر (CI/CD & Security Scanning)
* **التقنيات المستخدمة**: Trivy, GitLab CI (أو مسارات أخرى).
* **المسارات**: 
  * `.gitlab-ci.yml` أو ملفات المسارات المشابهة.
  * `/home/selcon/Downloads/Interprise-OnPremShopPay/scripts/scan-images.sh`
* **الآلية**:
  قبل أي عملية نشر، يتم بناء الصور وفحصها أمنياً باستخدام أداة `Trivy` لاكتشاف الثغرات. يتم منع رفع الصور أو استمرار عملية النشر إذا تم اكتشاف ثغرات عالية الخطورة.

---

### ملخص تدفق البيانات (Data Flow) - مشكلة المنتجات كمثال:
1. يطلب المستخدم زيارة صفحة المنتجات.
2. يرسل متصفح المستخدم طلباً للواجهة الأمامية `Frontend`.
3. الـ `Frontend` يقوم بعمل Fetch لـ `/api/products` (باستخدام Next.js Rewrites).
4. هذا الطلب يُوجَّه داخلياً (Egress from frontend to gateway) نحو الـ API Gateway (`Kong`).
5. يستقبل `Kong` الطلب على المنفذ 8000، يطابق الرابط `/api/products` ويوجهه إلى الـ `product-service` على المنفذ 4001.
6. الـ `product-service` تستعلم من قاعدة بياناتها `product-postgresql` عن المنتجات.
7. تعود البيانات عبر نفس المسار بشكل عكسي لتصل للعميل كاستجابة 200 OK.

هذا التقرير يمثل نظرة معمارية دقيقة لمشروعك، ويوضح التكامل القوي والمؤمّن بين كل مكوناته.
