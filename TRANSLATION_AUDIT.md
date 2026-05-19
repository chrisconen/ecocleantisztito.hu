# TRANSLATION AUDIT - kutyasetaltatok.hu
**Audit dátum:** 2026. január 24.  
**WordPress nyelv:** hu_HU ✅  
**Service Finder téma:** v6.1

---

## 📊 FORDÍTÁSI STATISZTIKA

### Általános Állapot
- **WordPress Core:** ✅ Teljesen magyarul
- **Service Finder téma:** ⚠️ **43% lefordítva** (1,959 / 4,529 string)
- **SF Booking plugin:** ⚠️ Részlegesen magyarul
- **SF Shortcodes:** ⚠️ Részlegesen magyarul  
- **SF Taxonomy:** ⚠️ Részlegesen magyarul

### Kritikus Számok
```
Összes fordítandó string: 4,529
✅ Lefordítva:          1,959 (43.3%)
❌ NEM lefordítva:      2,570 (56.7%) 
```

**PROBLÉMA:** Több mint fele a szövegeknek angolul van!

---

## 🔍 FORDÍTÁSI FÁJLOK HELYE

### Téma Fordítások
```
Aktív fordítás:
C:\wamp64\www\kutyasetaltatok\wp-content\languages\themes\service-finder-hu_HU.po
C:\wamp64\www\kutyasetaltatok\wp-content\languages\themes\service-finder-hu_HU.mo

Forrás template:
C:\wamp64\www\kutyasetaltatok\wp-content\themes\service-finder\languages\service-finder.pot
```

### Plugin Fordítások
```
C:\wamp64\www\kutyasetaltatok\wp-content\languages\plugins\
├── sf-booking-hu_HU.mo (ha létezik)
├── sf-shortcodes-hu_HU.mo (ha létezik)
└── sf-texonomy-hu_HU.mo (ha létezik)
```

---

## 🚨 KRITIKUS ANGOL SZÖVEGEK (Frontend)

### 1. MARKETPLACE SPECIFIKUS SZÖVEGEK

#### Provider (Szolgáltató) Szövegek
```
❌ "Become a Provider" → "Regisztrálj Szolgáltatóként"
❌ "Provider Dashboard" → "Szolgáltató Irányítópult"  
❌ "My Services" → "Szolgáltatásaim"
❌ "Earnings" → "Bevételeim"
❌ "Bookings" → "Foglalások"
❌ "Payout" → "Kifizetés"
❌ "Add Service" → "Szolgáltatás hozzáadása"
❌ "Service Settings" → "Szolgáltatás beállítások"
❌ "Availability" → "Elérhetőség"
❌ "Region" → "Régió"
```

#### Gazdi (Customer) Szövegek
```
❌ "Book Now" → "Foglalás"
❌ "My Bookings" → "Foglalásaim"
❌ "Favorites" → "Kedvencek"
❌ "Find a Provider" → "Szolgáltató keresése"
❌ "Search Services" → "Szolgáltatások keresése"
❌ "Filter by Location" → "Szűrés helyszín szerint"
❌ "View Profile" → "Profil megtekintése"
❌ "Request Quote" → "Árajánlat kérése"
```

#### Adminisztratív Szövegek
```
❌ "Commission Rate" → "Jutalék"
❌ "Platform Fee" → "Platform díj"
❌ "Payout History" → "Kifizetési előzmények"
❌ "Pending Approval" → "Jóváhagyásra vár"
❌ "Approved" → "Jóváhagyva"
❌ "Rejected" → "Elutasítva"
```

### 2. NAVIGÁCIÓS ELEMEK

```
❌ Header Menu:
   - "Home" → "Főoldal"
   - "Categories" → "Kategóriák"
   - "How It Works" → "Hogyan működik?"
   - "Sign Up" → "Regisztráció"
   - "Log In" → "Bejelentkezés"
   - "Contact" → "Kapcsolat"

❌ Footer:
   - "About Us" → "Rólunk"
   - "Terms & Conditions" → "Általános Szerződési Feltételek"
   - "Privacy Policy" → "Adatvédelmi Tájékoztató"
   - "FAQ" → "GYIK"
```

### 3. KATEGÓRIÁK

```
❌ "Dog Walking" → "Kutyasétáltatás"
❌ "Dog Boarding" → "Kutyapanzió"
❌ "Dog Grooming" → "Kutyakozmetika"
❌ "Dog Training" → "Kutyakiképzés"
❌ "Pet Sitting" → "Kisállat felügyelet"
❌ "Pet Taxi" → "Kisállat taxi"
```

### 4. FOGLALÁSI FOLYAMAT

```
❌ Booking Form:
   - "Select Date" → "Válassz dátumot"
   - "Select Time" → "Válassz időpontot"
   - "Duration" → "Időtartam"
   - "Additional Notes" → "Megjegyzések"
   - "Total Price" → "Végösszeg"
   - "Confirm Booking" → "Foglalás megerősítése"
   - "Pay Now" → "Fizetés"
   - "Payment Method" → "Fizetési mód"

❌ Confirmation:
   - "Booking Confirmed" → "Foglalás megerősítve"
   - "Booking Pending" → "Foglalás függőben"
   - "Booking Cancelled" → "Foglalás törölve"
```

### 5. EMAIL SABLONOK ⚠️ KRITIKUS!

```
❌ Customer Emails:
   - Subject: "Booking Confirmation" → "Foglalás visszaigazolása"
   - Subject: "Booking Reminder" → "Foglalás emlékeztető"
   - Body: "Dear Customer" → "Kedves Ügyfél"
   - Body: "Thank you for booking" → "Köszönjük a foglalást"

❌ Provider Emails:
   - Subject: "New Booking Request" → "Új foglalás érkezett"
   - Subject: "Payout Notification" → "Kifizetési értesítés"
   - Body: "You have a new booking" → "Új foglalást kaptál"
   - Body: "Your payout is ready" → "Kifizetésed elkészült"

❌ Admin Emails:
   - Subject: "New Provider Registration" → "Új szolgáltató regisztráció"
   - Subject: "Payout Request" → "Kifizetési kérelem"
```

### 6. DASHBOARD ELEMEK

```
❌ Provider Dashboard:
   - "Statistics" → "Statisztikák"
   - "Today's Bookings" → "Mai foglalások"
   - "This Week" → "Ez a hét"
   - "This Month" → "Ez a hónap"
   - "Total Earnings" → "Összes bevétel"
   - "Pending Payouts" → "Folyamatban lévő kifizetések"
   - "Reviews" → "Értékelések"
   - "Profile Completion" → "Profil kitöltöttség"

❌ Customer Dashboard:
   - "Upcoming Bookings" → "Közelgő foglalások"
   - "Past Bookings" → "Korábbi foglalások"
   - "Saved Providers" → "Mentett szolgáltatók"
   - "Messages" → "Üzenetek"
```

### 7. PROFIL OLDALAK

```
❌ Provider Profile:
   - "About Me" → "Bemutatkozás"
   - "Services Offered" → "Szolgáltatások"
   - "Pricing" → "Árazás"
   - "Working Hours" → "Munkaidő"
   - "Service Area" → "Kiszolgált terület"
   - "Languages" → "Nyelvek"
   - "Experience" → "Tapasztalat"
   - "Verified" → "Ellenőrzött"
   - "Member Since" → "Tag óta"

❌ Customer Profile:
   - "My Pets" → "Háziállatjaim"
   - "Pet Name" → "Állat neve"
   - "Pet Age" → "Állat kora"
   - "Pet Breed" → "Fajta"
   - "Special Notes" → "Speciális megjegyzések"
```

### 8. ÉRTÉKELÉSEK & VÉLEMÉNYEK

```
❌ "Reviews" → "Értékelések"
❌ "Rating" → "Értékelés"
❌ "Write a Review" → "Vélemény írása"
❌ "Verified Purchase" → "Ellenőrzött foglalás"
❌ "Helpful" → "Hasznos"
❌ "Report" → "Jelentés"
❌ "Response from Provider" → "Szolgáltató válasza"
```

### 9. KERESÉS & SZŰRÉS

```
❌ "Search for services..." → "Keress szolgáltatást..."
❌ "Filter Results" → "Szűrés"
❌ "Sort by:" → "Rendezés:"
   - "Relevance" → "Relevancia"
   - "Price: Low to High" → "Ár: növekvő"
   - "Price: High to Low" → "Ár: csökkenő"
   - "Rating" → "Értékelés"
   - "Distance" → "Távolság"

❌ "Show on Map" → "Mutasd térképen"
❌ "List View" → "Lista nézet"
❌ "Grid View" → "Rács nézet"
```

### 10. FIZETÉS & PÉNZÜGYEK

```
❌ Payment:
   - "Payment Details" → "Fizetési adatok"
   - "Credit Card" → "Bankkártya"
   - "PayPal" → "PayPal" (marad)
   - "Stripe" → "Stripe" (marad)
   - "Card Number" → "Kártyaszám"
   - "Expiry Date" → "Lejárat dátuma"
   - "CVV" → "CVV"
   - "Billing Address" → "Számlázási cím"
   - "Pay Securely" → "Biztonságos fizetés"

❌ Invoice:
   - "Invoice" → "Számla"
   - "Invoice Number" → "Számlaszám"
   - "Date" → "Dátum"
   - "Subtotal" → "Részösszeg"
   - "Commission" → "Jutalék"
   - "Total" → "Végösszeg"
   - "Download PDF" → "PDF letöltése"
```

---

## 🛠️ FORDÍTÁSI MEGOLDÁSOK

### 1. GYORS MEGOLDÁS (Sürgős szövegek)

**Lépések:**
1. ✅ Másold ki a .po fájlt: `service-finder-hu_HU-BACKUP.po`
2. Nyisd meg Poedit-ban: https://poedit.net/
3. Fordítsd le a kritikus szövegeket (lásd fent)
4. Save → generál .mo fájlt
5. Upload wp-content/languages/themes/

**Kritikus szövegek prioritás:**
1. **P1 - Navigáció** (10 string)
2. **P1 - Foglalási folyamat** (20 string)
3. **P1 - Email sablonok** (15 string)
4. **P2 - Dashboard** (30 string)
5. **P3 - Maradék** (2,500+ string)

### 2. PROFESSZIONÁLIS MEGOLDÁS (Teljes fordítás)

**Opció A: Loco Translate Plugin (AJÁNLOTT)**
```powershell
cd C:\wamp64\www\kutyasetaltatok
C:\wamp64\bin\wp-cli\wp.bat plugin install loco-translate --activate
```

Előnyök:
- WordPress admin felületről kezelhető
- Egyszerű UI (mint Poedit)
- Automatikus .mo generálás
- Backup funkció
- Sync a .pot template-tel

**Lépések:**
1. Install Loco Translate
2. Dashboard → Loco Translate → Themes → Service Finder
3. Edit Hungarian translation
4. Szűrés: "Untranslated" (2,570 string)
5. Fordítás prioritás szerint (P1, P2, P3)
6. Save → automatikus .mo generálás

**Opció B: Machine Translation + Manual Review**

Használj AI-t a tömegfordításhoz:
```python
# Python script példa
import openai
import polib

po = polib.pofile('service-finder-hu_HU.po')

for entry in po.untranslated_entries():
    # OpenAI API call
    translation = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{
            "role": "user",
            "content": f"Translate to Hungarian (pet services context): {entry.msgid}"
        }]
    )
    entry.msgstr = translation.choices[0].message.content

po.save()
```

Majd:
- Manual review kritikus szövegekhez
- Context-based corrections (marketplace, not simple service)

### 3. EMAIL SABLONOK FORDÍTÁSA

Email sablonok helye:
```
C:\wamp64\www\kutyasetaltatok\wp-content\plugins\sf-booking\templates\emails\
```

**Ellenőrizendő fájlok:**
- `booking-confirmation.php`
- `booking-reminder.php`
- `new-booking-provider.php`
- `payout-notification.php`
- stb.

**Módosítás:**
1. Nyisd meg a template fájlt
2. Keress `<?php esc_html_e` vagy `<?php _e` függvényeket
3. Ezek már translatable stringek
4. A fordításokat a .po fájlban kell megadni

---

## 📋 FORDÍTÁSI CHECKLIST

### Sürgős (Most azonnal)
- [ ] Install Loco Translate plugin
- [ ] Navigációs elemek (10 string)
- [ ] Foglalási form (20 string)  
- [ ] Email subject-ek (10 string)

### 1 héten belül
- [ ] Dashboard szövegek (Provider + Customer)
- [ ] Kategóriák
- [ ] Profil oldalak
- [ ] Email body-k teljes fordítása

### 2 héten belül
- [ ] Összes maradék string (2,500+)
- [ ] Admin backend szövegek
- [ ] Error messages
- [ ] Help text-ek

---

## 🎯 VÁRHATÓ EREDMÉNYEK

### Fordítás után
- ✅ 100% magyar nyelvű frontend
- ✅ Professzionális megjelenés
- ✅ Csökken a bounce rate (angolul nem értenek)
- ✅ Növekszik a konverzió (világos szövegek)
- ✅ Provider regisztrációk növekedése

### Jelenleg (43% fordítás)
- ❌ Zavaró angol-magyar keverék
- ❌ Professzionálisnak tűnő, de angolul van
- ❌ Nehéz megérteni a rendszert
- ❌ Potenciális provider-ek elbizonytalanodnak

---

## 💰 KÖLTSÉGBECSLÉS

| Megoldás | Idő | Költség |
|----------|-----|---------|
| **DIY (Loco Translate)** | 20-30 óra | 0 Ft |
| **Professzionális fordító** | 1 hét | 150,000-300,000 Ft |
| **AI + Manual review** | 10-15 óra | 0 Ft (API költség) |

**AJÁNLÁS:** DIY (Loco Translate) + Prioritás alapú fordítás

---

## 📞 KÖVETKEZŐ LÉPÉSEK

1. ✅ **KÉSZ:** Translation audit
2. ⏭️ **MA:** Loco Translate telepítése
3. ⏭️ **MA:** P1 szövegek fordítása (Navigation, Booking form)
4. ⏭️ **HOLNAP:** P1 Email sablonok
5. ⏭️ **1 HÉT:** P2 Dashboard szövegek
6. ⏭️ **2 HÉT:** P3 Maradék szövegek

---

**TRANSLATION AUDIT VÉGE**

*Következő: TASK.md frissítése marketplace kontextussal*
