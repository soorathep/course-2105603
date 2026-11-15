# ระบบ exit ticket และ feedback (ใช้ร่วมกันทุกวิชา)

ฉบับวันที่ 15 พฤศจิกายน 2026 · ใช้อยู่ใน 2105603 และ 2105315

นิสิตสแกน QR code บนสไลด์ท้ายคาบ แล้วกรอกฟอร์มบนเว็บ ฟอร์มส่งคำตอบไปที่ Cloudflare Worker ตัวกลาง Worker บันทึกคำตอบเป็นไฟล์ JSON หนึ่งไฟล์ต่อหนึ่งคำตอบ ลงใน GitHub repo ส่วนตัว ระบบไม่ถามและไม่เก็บชื่อ รหัสนิสิต อีเมล หรือ IP

```
QR code ──> exit.html?s=N ──POST──> Cloudflare Worker ──GitHub API──> soorathep/course-feedback (private)
(สไลด์)     (เว็บของวิชา)             (ตรวจข้อมูล ถือ token)           responses/<รหัสวิชา>/sNN/<วันที่>-<id>.json
```

## ส่วนประกอบ

| ส่วน | อยู่ที่ไหน | หน้าที่ |
|---|---|---|
| ฟอร์ม | `exit.html` ในเว็บของแต่ละวิชา เปิดด้วย `?s=<เลขคาบ>` | คำถาม exit ticket ของคาบ และ feedback สั้น ๆ ส่งสำเร็จจะขึ้น "Response received." |
| QR code | ไฟล์ PNG หนึ่งไฟล์ต่อคาบ วางในสไลด์ exit ticket | ชี้ไปที่ `exit.html?s=N` ของคาบนั้น |
| Relay | Cloudflare Worker `course-feedback-relay` | รับคำตอบ ตรวจรูปแบบ แล้วเขียนไฟล์ลง GitHub ผ่าน API |
| ที่เก็บข้อมูล | repo ส่วนตัว `soorathep/course-feedback` | `responses/<รหัสวิชา>/sNN/<วันที่>-<id>.json` แยกโฟลเดอร์ตามวิชาและคาบเอง |
| สรุปผล | `collect.py` | รวมคำตอบเป็น CSV หนึ่งไฟล์ต่อวิชาต่อคาบ เปิดใน Excel ได้ภาษาไทยไม่เพี้ยน |

ต้นฉบับของ Worker, `collect.py` และคู่มือติดตั้ง อยู่ใน repo `soorathep/course-2105603` ที่ `_teaching-src/2105603/slides-2027/feedback/` (`worker.js`, `collect.py`, `README.md`, และเอกสารนี้ `SYSTEM-th.md`) สำเนาเดิมใน `soorathep/Test` ไม่ได้ปรับตามแล้ว ให้ถือฉบับใน `course-2105603` เป็นหลัก

## คำถามในฟอร์ม

| ช่อง | ตัวเลือก | บังคับ |
|---|---|---|
| `session` | คาบที่ 1 ถึงจำนวนคาบของวิชา | ใช่ |
| `mode` | In class / On my own | ใช่ (ค่าเริ่มต้น In class) |
| `exit_ticket` | ข้อความ ไม่เกิน 3000 ตัวอักษร | ใช่ |
| `pace` | Too slow / About right / Too fast | ไม่ |
| `confidence` | 1 ถึง 5 | ไม่ |
| `lab` | Yes / Partly / No, I need help / Not used | ไม่ |
| `unclear` | ข้อความ: ยังไม่เข้าใจตรงไหน | ไม่ |
| `change` | ข้อความ: อยากให้ปรับอะไรหนึ่งอย่าง | ไม่ |

Worker รับเฉพาะค่าตามตารางนี้ ค่าอื่นจะถูกทิ้ง มีช่องดักสแปม (`website`) ที่มองไม่เห็น ถ้ามีค่าจะถูกปฏิเสธ

ถ้าวิชาใดอยากเปลี่ยนตัวเลือก ต้องแก้ทั้ง `exit.html` และ `CHOICES` ใน Worker ให้ตรงกัน ถ้าแก้แค่ข้อความคำถาม (เช่น "Could you now do today's check on your own?") แก้เฉพาะ `exit.html` ได้ ตราบใดที่ค่าที่ส่งไม่เปลี่ยน

## การเพิ่มวิชาใหม่

ใช้ Worker และ repo เดิม ไม่ต้องสร้างใหม่

1. **เพิ่มวิชาใน Worker.** ใน Cloudflare เปิด Workers & Pages > `course-feedback-relay` > Edit code แก้บรรทัด `COURSES` เพิ่มรหัสวิชาและจำนวนคาบ แล้วกด Deploy

   ```js
   const COURSES = { '2105603': 7, '2105315': 14, '<รหัสวิชาใหม่>': <จำนวนคาบ> };
   ```

   ถ้าเว็บของวิชาอยู่บนโดเมนที่ยังไม่มีใน `ALLOWED_ORIGINS` ให้เพิ่มด้วย ตอนนี้มี `https://www.skhgroup.net`, `https://skhgroup.net`, `https://soorathep.github.io` (ใส่แค่ origin ไม่มี path)

2. **แก้สำเนา `worker.js` ใน repo ให้ตรงกับที่ deploy.** ทุกครั้งที่แก้ใน Cloudflare ให้แก้ไฟล์ใน repo ด้วย ไม่อย่างนั้นครั้งต่อไปที่มีคนวางโค้ดจาก repo ลงไป วิชาอื่นจะถูกปฏิเสธ

3. **คัดลอก `exit.html` ไปไว้ในเว็บของวิชา** แล้วแก้ 5 จุด

   | จุด | ตัวอย่าง |
   |---|---|
   | `<title>` และบรรทัดชื่อวิชา (`<p class="course">`) | `2105315 Data Analytics in Chemical Engineering` |
   | `const COURSE` | `'2105315'` ต้องตรงกับใน Worker |
   | `const TOTAL` | `14` ต้องไม่เกินจำนวนคาบใน Worker |
   | `const PROMPTS` | คำถาม exit ticket ของแต่ละคาบ `{ 1: '...', 2: '...' }` คาบที่ไม่มีจะขึ้นข้อความให้ดูคำถามจากสไลด์ |
   | path ของฟอนต์ไทยใน `@font-face` | ชี้ไปที่ไฟล์ Sarabun ที่มีในเว็บนั้นจริง |

   ห้ามใส่ token หรือรหัสผ่านใดในหน้าเว็บ หน้าเว็บรู้แค่ที่อยู่ของ Worker (`RELAY_URL`)

4. **ทำ QR code ต่อคาบ** ชี้ไปที่ที่อยู่เต็มของฟอร์ม เช่น `https://<เว็บของวิชา>/.../exit.html?s=1` ตัวอย่างสคริปต์ (สีกราไฟต์บนพื้นขาว 600 dpi) อยู่ที่ `_teaching-src/2105315/slides/make_exit_qr.py` ใน repo `course-2105315`

   ```bash
   pip install qrcode pillow
   python3 make_exit_qr.py 1 2 3     # ได้ figures/exit-qr-s01.png ...
   ```

   หลังทำเสร็จ สแกนด้วยโทรศัพท์จริงหนึ่งครั้งว่าเปิดฟอร์มคาบที่ถูกต้อง

5. **ใส่ในสไลด์ exit ticket** (Quarto) ตัวอย่างจาก 2105315

   ```markdown
   ## Exit ticket · 5 minutes {#exit .activity}

   :::: {.columns}
   ::: {.column width="64%"}
   ::: {.prompt}
   <คำถามของคาบ ตรงกับ PROMPTS ใน exit.html>
   :::
   Scan the code or open the link. No name or student ID is recorded. Wait for **"Response received."**
   :::
   ::: {.column width="32%" .qr-col}
   ![](figures/exit-qr-s01.png){.qr fig-alt="QR code for the Session 1 exit ticket and feedback form"}

   [Open the Session 1 form](exit.html?s=1){target="_blank"}
   :::
   ::::
   ```

   ใน `_quarto.yml` ใส่ `figures/*.png` และ `exit.html` ไว้ใน `resources` เพื่อให้ถูกคัดลอกไปกับสไลด์ ถ้าสไลด์มีเสียงบรรยายหรือคำบรรยาย ให้แก้บทของสไลด์นี้ให้ตรงกับคำถามด้วย

6. **ทดสอบก่อนใช้จริง** เปิดฟอร์มจากโทรศัพท์ ส่งคำตอบทดสอบหนึ่งครั้ง ต้องขึ้น "Response received." แล้วดูว่ามีไฟล์ใหม่ใน `responses/<รหัสวิชา>/s01/` ของ repo ส่วนตัว ถ้าไม่ต้องการเก็บคำตอบทดสอบ ลบไฟล์นั้นออกจาก repo

## ข้อความผิดพลาดที่พบบ่อย

| ข้อความในฟอร์ม | สาเหตุ | แก้ |
|---|---|---|
| Unknown course. | รหัสวิชาไม่อยู่ใน `COURSES` ของ Worker ที่ deploy อยู่ | เพิ่มใน Worker แล้ว Deploy |
| Unknown session. | เลขคาบเกินจำนวนใน `COURSES` | แก้จำนวนคาบใน Worker หรือ `TOTAL` ในฟอร์ม |
| Forbidden หรือส่งไม่ออก (CORS) | โดเมนของเว็บไม่อยู่ใน `ALLOWED_ORIGINS` | เพิ่ม origin ใน Worker |
| Could not save. Please try again. | Worker เขียนลง GitHub ไม่ได้ มักเป็นเพราะ token หมดอายุ | ออก token ใหม่ ใส่ใน Cloudflare (Settings > Variables > `GITHUB_TOKEN`) |
| The exit-ticket answer is empty. | ไม่ได้ตอบช่อง exit ticket | ให้นิสิตตอบช่องนั้น |

## อ่านผล

```bash
git clone https://github.com/soorathep/course-feedback.git   # ครั้งแรก (repo ส่วนตัว ต้องล็อกอิน)
cd course-feedback
git pull
python3 collect.py        # ได้ summary/<รหัสวิชา>-sNN.csv
```

คัดลอก `collect.py` ไปไว้ใน repo นี้ครั้งเดียว คอลัมน์ที่ได้: received, mode, exit_ticket, pace, confidence, lab, unclear, change

## ความเป็นส่วนตัว

- ฟอร์มไม่ถามชื่อ รหัสนิสิต หรืออีเมล Worker ไม่บันทึก IP
- คำตอบอยู่ใน repo ส่วนตัวที่อ่านได้เฉพาะเจ้าของ
- นิสิตอาจพิมพ์ข้อมูลส่วนตัวเองลงในช่องข้อความ ก่อนนำคำตอบไปเผยแพร่หรือรวมในชุดเก็บถาวร (เช่น Zenodo) ต้องตรวจและลบข้อมูลส่วนตัวออก
- ไฟล์ใน `course-feedback` ไม่ควรรวมอยู่ในชุดเก็บถาวรของวิชา

## ข้อมูลระบบปัจจุบัน

| รายการ | ค่า |
|---|---|
| Worker | `https://course-feedback-relay.ecs-thailand-election.workers.dev/` (บัญชี Cloudflare soorathep.k, แผนฟรี) |
| Repo เก็บคำตอบ | `soorathep/course-feedback` (private) |
| Token | fine-grained, สิทธิ์ Contents read/write เฉพาะ repo นี้, เก็บเป็น secret `GITHUB_TOKEN` ใน Cloudflare, หมดอายุประมาณพฤศจิกายน 2027 |
| วิชาที่ใช้ | 2105603 (7 คาบ), 2105315 (14 คาบ) |
| Origin ที่อนุญาต | `https://www.skhgroup.net`, `https://skhgroup.net`, `https://soorathep.github.io` |

ตั้งการเตือนไว้ก่อนพฤศจิกายน 2027 เพื่อต่ออายุ token ถ้า token หมดอายุ ฟอร์มทุกวิชาจะส่งไม่ได้พร้อมกัน
