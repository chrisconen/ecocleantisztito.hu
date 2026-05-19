# TASK.MD V2 - MARKETPLACE VERZIÓ - kutyasetaltatok.hu
**Projekt:** Kutyasétáltató MARKETPLACE platform  
**Fázis:** 1 - Marketplace MVP  
**Becsült idő:** ~25 óra (FRISSÍTVE)  
**Cél:** Működő kétoldalú piac (Provider + Gazdi) magyar nyelven

---

## 🚨 KRITIKUS KONTEXTUS FRISSÍTÉS

### ÜZLETI MODELL: MARKETPLACE (Nem egyszerű szolgáltatás!)

**Szereplők:**
1. **Gazdik (Customers)** - kutyasétáltatást keresnek
2. **Providerek (Szolgáltatók)** - egyéni vállalkozók, sétáltatók
3. **Platform (Chris)** - jutalékot kap minden tranzakcióból

### Hogyan Működik:
- Sétáltatók **SAJÁT MAGUK regisztrálnak** Provider-ként
- **Self-service:** Saját árak, szolgáltatások, régió, munkaidő beállítása
- Saját fotók feltöltése (KORLÁTOZNI KELL - tárhely!)
- **SF Booking rendszer** = központi foglalási motor
- **SF Admin Dashboard** = Statisztikák, pénzügyek
- **Jutalék beállítás:** Theme Options menüben

### Jelenlegi Adatok:
- **60 MetForm Entry** = Landing page lead-ek (októbertől) 🔥
- **17 Regisztrált User** = Provider kategóriában vannak
- **SF Booking aktív** = Marketplace infra működik

---

## 🎯 FÁZIS 1 - FRISSÍTETT SCOPE

**Változások az eredeti TASK.md-hez képest:**

### ❌ ELTÁVOLÍTVA (Marketplace miatt):
- ~~WooCommerce vs SF Booking döntés~~ → **SF Booking MARAD!**
- ~~WooCommerce termékek cleanup~~ → Maradnak (payment gateway)
- ~~WP Job Manager törlése~~ → Lehet hasznos később (job post-ok)
- ~~Sétáltatók bemutatkozása (team page)~~ → Provider Profile automatikus

### ✅ HOZZÁADVA (Marketplace miatt):
- **FORDÍTÁS KRITIKUS!** (56.7% angolul van)
- Provider fotó feltöltés limitálás
- Két különböző user flow: Gazdi vs Provider
- 60 MetForm lead email marketing kampány
- Jutalék rendszer ellenőrzés (Theme Options)
- Provider Dashboard fordítás audit

---

## 📋 FRISSÍTETT FELADATLISTA

---

### TASK 0: FORDÍTÁS (ÚJ - KRITIKUS!)
**Prioritás:** P0 - BLOKKOLÓ  
**Idő:** 8 óra  
**Státusz:** ⏳ TODO

#### Probléma:
- **56.7% ANGOLUL VAN** (2,570 / 4,529 string)
- Provider dashboard, foglalási form, email-ek angolul
- Nem professzionális, zavaró

#### 0.1 Loco Translate Telepítése

```powershell
cd C:\wamp64\www\kutyasetaltatok
C:\wamp64\bin\wp-cli\wp.bat plugin install loco-translate --activate
```

#### 0.2 Kritikus Szövegek Fordítása (P0)

**Dashboard → Loco Translate → Themes → Service Finder**

**Priority 1 - Navigáció (10 string):**
```
"Home" → "Főoldal"
"Categories" → "Kategóriák"
"How It Works" → "Hogyan működik?"
"Sign Up" → "Regisztráció"
"Log In" → "Bejelentkezés"
"Contact" → "Kapcsolat"
"Become a Provider" → "Szolgáltatóként regisztrálok"
```

**Priority 1 - Foglalási Form (20 string):**
```
"Book Now" → "Foglalás"
"Select Date" → "Válassz dátumot"
"Select Time" → "Időpont"
"Duration" → "Időtartam"
"Total Price" → "Végösszeg"
"Confirm Booking" → "Foglalás megerősítése"
"Payment Method" → "Fizetési mód"
"Additional Notes" → "Megjegyzések"
```

**Priority 1 - Provider Dashboard (30 string):**
```
"Provider Dashboard" → "Szolgáltató Irányítópult"
"My Services" → "Szolgáltatásaim"
"Add Service" → "Szolgáltatás hozzáadása"
"Bookings" → "Foglalások"
"Earnings" → "Bevételeim"
"Payout" → "Kifizetés"
"Statistics" → "Statisztikák"
"Reviews" → "Értékelések"
"Profile" → "Profil"
```

**Priority 1 - Email Subject-ek (10 string):**
```
"Booking Confirmation" → "Foglalás visszaigazolása"
"New Booking Request" → "Új foglalás érkezett"
"Booking Reminder" → "Foglalás emlékeztető"
"Payout Notification" → "Kifizetési értesítés"
```

**WP-CLI ellenőrzés:**
```powershell
# Fordítások újratöltése
C:\wamp64\bin\wp-cli\wp.bat language core update
C:\wamp64\bin\wp-cli\wp.bat language theme update --all
```

**DELIVERABLE:**
- ✅ Loco Translate telepítve
- ✅ P1 szövegek (70 string) lefordítva
- ✅ Frontend magyarul működik

---

### TASK 1: Technikai Alapok
**Prioritás:** P1 - KRITIKUS  
**Idő:** 2 óra  
**Státusz:** ⚠️ RÉSZBEN KÉSZ

#### 1.1 PHP Memory Limit ✅ KÉSZ
```
✅ wp-config.php: 128MB → 512MB
```

#### 1.2 Debug Mode Kikapcsolása

```php
// wp-config.php - változtasd meg:
define( 'WP_DEBUG', false );
define( 'WP_DEBUG_LOG', false );
define( 'WP_DEBUG_DISPLAY', false );
```

#### 1.3 Plugin Frissítések

```powershell
cd C:\wamp64\www\kutyasetaltatok

# BACKUP ELŐSZÖR!
C:\wamp64\bin\wp-cli\wp.bat db export backup-before-updates.sql

# Aktív pluginok frissítése
C:\wamp64\bin\wp-cli\wp.bat plugin update elementor elementor-pro_3.32.2 code-snippets
```

#### 1.4 ~~Felesleges Pluginok Törlése~~ → MÓDOSÍTVA!

**NE TÖRÖLD:**
- WP Job Manager (később hasznos lehet job post-okhoz)
- WooCommerce (payment gateway a SF Booking-hoz)
- WooCommerce Stripe (fizetés)

**TÖRÖLD:**
```powershell
# Csak ezeket töröld:
C:\wamp64\bin\wp-cli\wp.bat plugin delete backuply complianz-gdpr one-click-demo-import revslider user-role-editor woocommerce-payments wp-job-manager-alerts wp-rocket
```

#### 1.5 Essential Addons - VÁLTOZATLAN
```powershell
# Csak a PRO verziót tartsd meg
C:\wamp64\bin\wp-cli\wp.bat plugin deactivate essential-addons-for-elementor-lite
C:\wamp64\bin\wp-cli\wp.bat plugin delete essential-addons-for-elementor-lite
```

---

### TASK 2: Tartalom Cleanup (FRISSÍTVE)
**Prioritás:** P1 - KRITIKUS  
**Idő:** 1.5 óra  
**Státusz:** ⏳ TODO

#### 2.1 Duplikált Szolgáltatások Törlése - VÁLTOZATLAN

```powershell
# "Sétáltatás 30 perc" 3x duplikálva - töröld 2-t
C:\wamp64\www\kutyasetaltatok; C:\wamp64\bin\wp-cli\wp.bat post list --post_type=sf_services --format=table --fields=ID,post_title,post_date

# Töröld a RÉGEBBI 2 duplikációt
```

#### 2.2 Felesleges Home Page-ek - VÁLTOZATLAN

```powershell
# Tartsd meg: "Főoldal" (ID: 77)
# Töröld: Home 1-10, Home 4-2, stb.
```

#### 2.3 ~~WooCommerce vs SF Booking~~ → TÖRLVE!

**SF BOOKING MARAD!**
- SF Booking = Foglalási rendszer ✅
- WooCommerce = Payment gateway ✅
- NINCS konfliktus, együtt működnek!

**NE TÖRÖLJ WooCommerce termékeket!**

---

### TASK 3: Menü Struktúra (FRISSÍTVE MARKETPLACE-re)
**Prioritás:** P1 - KRITIKUS  
**Idő:** 2 óra  
**Státusz:** ⏳ TODO

#### 3.1 Fő Navigációs Menü (Header)

**Marketplace struktúra:**
```
🏠 Főoldal
📂 Kategóriák  →  [Kutyasétáltatás, Kutyapanzió, Kutyakozmetika, stb.]
💡 Hogyan működik?
   ↳ Gazdiknak
   ↳ Szolgáltatóknak
👤 Szolgáltatóként regisztrálok  →  [CTA prominens!]
🔐 Bejelentkezés
```

**WP-CLI létrehozás:**
```powershell
cd C:\wamp64\www\kutyasetaltatok

# 1. Menü létrehozása
C:\wamp64\bin\wp-cli\wp.bat menu create "Fő menü"

# 2. Főoldal (ID: 77)
C:\wamp64\bin\wp-cli\wp.bat menu item add-post 1 77

# 3. Kategóriák - később hozzáadod, ha megvannak a kategória oldalak

# 4. "Hogyan működik?" oldal - Task 4-ben létrehozod

# 5. "Szolgáltatóként regisztrálok" - Link a Provider registration page-re
# Ezt a SF Booking-ban találod meg az URL-jét

# 6. Login oldal
C:\wamp64\bin\wp-cli\wp.bat post list --post_type=page --s="Login" --fields=ID
C:\wamp64\bin\wp-cli\wp.bat menu item add-post 1 [LOGIN_ID]
```

#### 3.2 Footer Menü - FRISSÍTVE

```
Információ:
- Rólunk         →  [Task 5]
- Kapcsolat
- GYIK          →  [Task 5]
- Blog

Jogi:
- Adatvédelem   →  [Task 6]
- ÁSZF          →  [Task 6]
- Cookie Policy →  [Task 6]

Szolgáltatóknak:
- Regisztráció
- Dashboard
- Segítség
```

---

### TASK 4: "Hogyan működik?" Oldal (ÚJ!)
**Prioritás:** P1 - KRITIKUS  
**Idő:** 5 óra  
**Státusz:** ⏳ TODO

Ez az oldal **KRITIKUS** egy marketplace-nél! Két verzió kell:

#### 4.1 Gazdiknak (Customers)

**Tartalom struktúra:**
```markdown
# Hogyan Működik? - Gazdiknak

## 3 Egyszerű Lépés

### 1️⃣ Keresd Meg a Tökéletes Sétáltatót
- Böngészd a szolgáltatókat helyszín, árak, értékelések szerint
- Nézd meg profiljukat, fotóikat, véleményeket
- Szűrj kutyád igényei alapján (kis/nagy kutya, speciális igények)

### 2️⃣ Foglalj Időpontot
- Válaszd ki a neketek megfelelő időpontot
- Add meg kutyád adatait, speciális kéréseit
- Fizess biztonságosan bankkártyával

### 3️⃣ Élvezd a Szabadidőd!
- Sétáltatód időben érkezik
- GPS követés: láthatod hol jár kutyád
- Fotók érkeznek a sétáról
- Értékeld a szolgáltatást

## Gyakori Kérdések (GYIK)
[5-6 legfontosabb kérdés]

## Biztonság & Garancia
- Minden sétáltató ellenőrzött
- Biztosítás minden sétára
- 24/7 ügyfélszolgálat
- Pénzvisszafizetési garancia

[KERESS SÉTÁLTATÓT] CTA gomb
```

**Elementor widgets:**
- Hero section
- Timeline (3 lépés)
- Icon boxes (biztonság, garancia)
- FAQ accordion
- CTA section

#### 4.2 Szolgáltatóknak (Providers)

**Tartalom struktúra:**
```markdown
# Hogyan Működik? - Szolgáltatóknak

## Légy a Saját Főnököd!

### 1️⃣ Regisztrálj Ingyen
- Hozd létre Provider profilodat 5 perc alatt
- Adj meg szolgáltatásaid, áraidat
- Töltsd fel fotóidat, bemutatkozásodat
- Add meg a kiszolgált területet

### 2️⃣ Fogadj Foglalásokat
- Gazdik megtalálnak a keresőben
- Értesítést kapsz új foglalásról
- Te döntöd el elfogadod-e
- Kezeld naptáradat, elérhetőségedet

### 3️⃣ Keress Pénzt!
- Végezd el a szolgáltatást
- Értékelés a gazdiktól
- Automatikus kifizetés [X] napon belül
- Követheted bevételeidet dashboardon

## Miért Válassz Minket?

✅ **Nincs előleg** - Ingyenes regisztráció
✅ **Flexibilis** - Saját árak, saját munkaidő
✅ **Biztonságos** - Garancia minden tranzakcióra
✅ **Transzparens** - [X]% jutalék, nincs rejtett költség
✅ **Marketing** - Mi hozzuk a gazdákat
✅ **Támogatás** - 24/7 segítség

## Mennyi a Jutalék?
[Magyarázd el a jutalék modellt]

## Kifizetés
- Heti/havi kifizetés
- PayPal vagy banki átutalás
- Követheted bevételeidet valós időben

[REGISZTRÁLJ SZOLGÁLTATÓKÉNT] CTA gomb (prominens!)
```

**Elementor widgets:**
- Hero + CTA
- Process timeline
- Icon boxes (benefit-ek)
- Pricing calculator (opcionális)
- Testimonials (provider vélemények - később)
- CTA section

---

### TASK 5: Főoldal Optimalizálás (FRISSÍTVE MARKETPLACE-re)
**Prioritás:** P1 - KRITIKUS  
**Idő:** 6 óra  
**Státusz:** ⏳ TODO

#### 5.1 Főoldal Struktúra - MARKETPLACE VERZIÓ

```
=================================
|  HERO SZEKCIÓ                 |
|  "Találd Meg Budapest Legjobb|
|   Kutyasétáltatóját"         |
|                              |
|  [KERESS SÉTÁLTATÓT] CTA     |
|  [SZOLGÁLTATÓKÉNT             |
|   REGISZTRÁLOK] Secondary    |
=================================
↓
|  KATEGÓRIÁK                  |
|  [6 card: Kutyasétáltatás,  |
|   Kutyapanzió, Kutyakozme-  |
|   tika, Kiképzés, ...]      |
=================================
↓
|  HOGYAN MŰKÖDIK?             |
|  [Gazdiknak] [Szolgáltatóknak]|
|  (Tab switcher)              |
=================================
↓
|  KIEMELT SZOLGÁLTATÓK        |
|  [4-6 provider card]         |
|  (Ha vannak provider-ek)     |
=================================
↓
|  STATISZTIKÁK                |
|  "17+ Szolgáltató"           |
|  "60+ Elégedett Ügyfél"      |
|  "100+ Sikeres Séta"         |
=================================
↓
|  BIZALOM & BIZTONSÁG         |
|  ✓ Ellenőrzött szolgáltatók |
|  ✓ Biztosított séták        |
|  ✓ GPS nyomon követés       |
|  ✓ Pénzvisszafizetési gar.  |
=================================
↓
|  PROVIDER CTA                |
|  "Légy a saját főnököd!"    |
|  "Keress pénzt kutyasétál-  |
|   tatással!"                |
|  [REGISZTRÁLJ] CTA          |
=================================
```

#### 5.2 Hero Szekció - KÉT CTA!

**Primary CTA (Gazdiknak):**
- "Keress Sétáltatót" → Search page / Provider listing
- Nagyobb, prominens gomb

**Secondary CTA (Szolgáltatóknak):**
- "Szolgáltatóként Regisztrálok" → Provider signup
- Kisebb, de látható gomb

#### 5.3 Kiemelt Szolgáltatók Szekció (Ha vannak)

```php
// SF Booking shortcode példa
[sf_providers limit="6" featured="yes"]
```

Ha még nincs provider:
- Placeholder card-ok "Hamarosan" felirattal
- Vagy skip this section

---

### TASK 6: GDPR & Legal Oldalak (VÁLTOZATLAN)
**Prioritás:** P1 - KRITIKUS  
**Idő:** 2 óra  
**Státusz:** ⏳ TODO

[Ugyanaz mint az eredeti TASK.md-ben]

---

### TASK 7: Kapcsolat Oldal (VÁLTOZATLAN)
**Prioritás:** P1 - KRITIKUS  
**Idő:** 1 óra  
**Státusz:** ⏳ TODO

[Ugyanaz mint az eredeti TASK.md-ben]

---

### TASK 8: Provider Fotó Limitálás (ÚJ!)
**Prioritás:** P2 - MAGAS  
**Idő:** 2 óra  
**Státusz:** ⏳ TODO

#### Probléma:
- Provider-ek korlátlan fotót tölthetnek fel
- Tárhely költség növekszik
- Későbbi VPS upgrade költséges

#### Megoldás:

**Ellenőrizd SF Booking Theme Options-ban:**

```
Dashboard → Service Finder → Theme Options → Provider Settings
```

Keresendő beállítások:
- Max upload files per provider
- Max file size
- Allowed file types

**Ha van ilyen opció:**
```
Max images: 10
Max file size: 2MB
Allowed: JPG, PNG
```

**Ha NINCS ilyen opció:**

Install plugin:
```powershell
C:\wamp64\bin\wp-cli\wp.bat plugin install user-role-editor --activate
```

Vagy custom code (Code Snippets plugin):
```php
// Limit provider photo uploads
add_filter('wp_handle_upload_prefilter', 'limit_provider_uploads');

function limit_provider_uploads($file) {
    $user = wp_get_current_user();
    
    // Check if user is provider
    if (in_array('provider', $user->roles)) {
        // Check file size (2MB max)
        if ($file['size'] > 2 * 1024 * 1024) {
            $file['error'] = 'File size exceeds 2MB limit.';
            return $file;
        }
        
        // Check number of uploaded files
        $upload_count = get_user_meta($user->ID, 'upload_count', true);
        if ($upload_count >= 10) {
            $file['error'] = 'Maximum 10 photos allowed.';
            return $file;
        }
        
        // Increment counter
        update_user_meta($user->ID, 'upload_count', $upload_count + 1);
    }
    
    return $file;
}
```

---

### TASK 9: MetForm Lead Email Kampány (ÚJ!)
**Prioritás:** P2 - MAGAS  
**Idő:** 3 óra  
**Státusz:** ⏳ TODO

#### 60 MetForm Entry = ARANYAK!

**9.1 Lead Export**

```powershell
# Dashboard → MetForm → Entries → Export CSV
# Vagy WP-CLI (komplex query):
cd C:\wamp64\www\kutyasetaltatok
C:\wamp64\bin\wp-cli\wp.bat post list --post_type=metform-entry --format=csv --fields=ID,post_date,meta:mf-entry-field-email,meta:mf-entry-field-name > metform-leads.csv
```

**9.2 Email Kampány Stratégia**

**Email 1 - Welcome (azonnal):**
```
Subject: Köszönjük az érdeklődést! 🐕

Szia [NÉV]!

Köszönjük, hogy regisztráltál a kutyasetaltatok.hu-n!

Örömmel jelentjük, hogy **most élőben indult** a platformunk! 

✅ 17+ Ellenőrzött sétáltató
✅ Biztonságos online fizetés
✅ GPS követés minden sétánál

[BÖNGÉSZD A SÉTÁLTATÓKAT] CTA

Vagy ha TE szeretnél sétáltatóként csatlakozni:
[REGISZTRÁLJ SZOLGÁLTATÓKÉNT]

Üdv,
Chris
kutyasetaltatok.hu
```

**Email 2 - Reminder (3 nap múlva):**
```
Subject: Még nem foglaltál? Itt az első séta kedvezmény! 🎁

Szia [NÉV]!

Láttuk, hogy regisztráltál, de még nem foglaltál sétát.

Különleges ajánlat neked:
🎁 **20% kedvezmény** az első sétádra
Kód: FIRSTWALK20

[FOGLALJ MOST] CTA

Ajánlat lejár: [DÁTUM]
```

**Email 3 - Provider Recruitment (1 hét múlva):**
```
Subject: Szeretnél pénzt keresni kutyasétáltatással? 💰

Szia [NÉV]!

Ha szereted a kutyákat és keresni szeretnél...

Csatlakozz szolgáltatóként!

💰 Te döntöd az árakat
⏰ Te döntöd a munkaidődet
🏠 Home office - saját környékeden

Csak [X]% jutalék, ingyenes regisztráció!

[TUDJ MEG TÖBBET]
```

**9.3 Email Marketing Tool**

**Opció A: WP Mail SMTP + Newsletter plugin**
```powershell
C:\wamp64\bin\wp-cli\wp.bat plugin install newsletter --activate
```

**Opció B: Mailchimp (ingyenes tier)**
- Import CSV
- Create campaign
- Schedule emails

---

### TASK 10: Jutalék Rendszer Ellenőrzés (ÚJ!)
**Prioritás:** P2 - MAGAS  
**Idő:** 1 óra  
**Státusz:** ⏳ TODO

#### Theme Options → Commission Settings

```
Dashboard → Service Finder → Theme Options
→ keress "Commission" vagy "Payout" vagy "Fee" szekcióra
```

**Ellenőrizd:**
1. Jutalék százalék beállítva? (pl. 15%)
2. Kifizetési threshold? (min. összeg kifizetéshez)
3. Kifizetési ütemezés? (heti/havi/on-demand)
4. PayPal / Stripe integration?

**Ha nincs beállítva:**
- Állítsd be a jutalékot (ajánlott: 10-20%)
- PayPal email cím megadása (kifizetésekhez)

**Dokumentálás:**
- Screenshot-old a beállításokat
- Add hozzá a "Hogyan működik? - Szolgáltatóknak" oldalhoz
- Transzparencia = bizalom!

---

## 🎯 FÁZIS 1 CHECKLIST (FRISSÍTVE)

### Fordítás (ÚJ!)
- [ ] Loco Translate telepítve
- [ ] P1 Navigáció (10 string) lefordítva
- [ ] P1 Foglalási form (20 string) lefordítva
- [ ] P1 Provider Dashboard (30 string) lefordítva
- [ ] P1 Email subject-ek (10 string) lefordítva

### Technikai
- [x] PHP memory limit 512MB ✅
- [ ] Debug mode OFF
- [ ] Pluginok frissítve
- [ ] Felesleges pluginok törölve (kivéve WooCommerce, WP Job Manager!)
- [ ] Essential Addons duplikáció fix

### Tartalom
- [ ] Szolgáltatások deduplikálva
- [ ] Home page-ek deduplikálva
- [ ] ~~WooCommerce cleanup~~ (NINCS cleanup, együtt működnek!)

### Navigáció (FRISSÍTVE)
- [ ] Header menü (marketplace struktúra)
- [ ] Footer menü
- [ ] "Szolgáltatóként regisztrálok" CTA menüben

### Oldalak (FRISSÍTVE)
- [ ] "Hogyan működik? - Gazdiknak" oldal
- [ ] "Hogyan működik? - Szolgáltatóknak" oldal
- [ ] Főoldal (marketplace verzió, 2 CTA)
- [ ] Kapcsolat oldal

### Legal
- [ ] Adatvédelmi Tájékoztató
- [ ] ÁSZF (marketplace-re szabva)
- [ ] Cookie Policy
- [ ] Cookie notice banner

### Marketplace Specifikus (ÚJ!)
- [ ] Provider fotó limitálás beállítva
- [ ] Jutalék rendszer ellenőrizve Theme Options-ban
- [ ] 60 MetForm lead exportálva
- [ ] Email kampány elkészítve (3 email)

**ÖSSZESEN: 0/32 (0%) KÉSZ** (frissített scope)

---

## 📊 FÁZIS 1 UTÁNI ÁLLAPOT (FRISSÍTVE)

**ELŐTT:**
- ❌ Kaotikus, duplikált tartalom
- ❌ Nincs menü/navigáció
- ❌ **56.7% angolul van** 🚨
- ❌ Nem egyértelmű, hogy marketplace
- ❌ Provider-ek nem tudnak regisztrálni
- ❌ 60 lead kihasználatlan

**UTÁN:**
- ✅ Professzionális marketplace
- ✅ **100% magyarul**
- ✅ Egyértelmű kétoldalú piac (Gazdi + Provider)
- ✅ Provider CTA prominens mindenhol
- ✅ 60 lead email kampány indítva
- ✅ Működő self-service provider regisztráció

---

## ⏭️ KÖVETKEZŐ: FÁZIS 2

**FÁZIS 2: BIZALOM ÉPÍTÉS & NÖVEKEDÉS (35 óra)**
- P2 Fordítások (maradék 2,500 string)
- Provider onboarding flow optimalizálás
- Automatikus email szekvenciák (booking, reminder, payout)
- Provider vélemények gyűjtése
- SEO optimalizálás (marketplace specifikus)
- Analytics dashboard (gazdik + providerek aktivitás)
- Referral program (provider ajánlási bónusz)

---

**TASK.MD V2 VÉGE**

*Kapcsolódó dokumentumok:*
- AUDIT.md (Eredeti audit)
- TRANSLATION_AUDIT.md (Fordítási audit - ÚJ!)
- IMPLEMENTATION_PLAN.md (3 fázis roadmap - UPDATE PENDING)
