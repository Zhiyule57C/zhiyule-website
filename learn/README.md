# 学习乐园 Learning Garden (demo)

Home-learning games for enrolled students, opened from the **学生登录 / Student Login** button in the site header (`/learn/`).

- `index.html` login · `home.html` lesson map · `lesson.html?n=1..48` games for one lesson
- `data/n1.js` is generated from the N1 48-lesson outline (字卡, 家庭共读小课文, 笔画书写) plus Term 1 home-activity tips; `data/hanzi.js` holds stroke data for the stroke-tracing game.
- Games: 认一认 word cards, 听音找字 listen & find, 读小课文 read along, 排一排 build the sentence, 描笔画 trace (single stroke or whole character + stroke count), 翻翻乐 memory (review lessons).
- Third-party: hanzi-writer (MIT) and hanzi-writer-data (Arphic Public License), licences in `vendor/`.

## Demo only

Accounts are hard-coded in `app.js` and progress is stored in the browser (`localStorage`). Anyone can read the demo passwords in the page source. Before real students use it, it needs:

1. A sign-in service (for example Firebase Auth or Supabase) with one account per enrolled child or parent, created by the centre, plus password reset.
2. Progress saved on the server so it follows the child across devices, and a simple teacher/admin view.
3. PDPA: parental consent, a privacy notice for children's data, and deletion when a child leaves.
4. Audio: clips in `audio/v30/` were generated with the open-source Kokoro v1.1-zh voice model (Apache-2.0, voice 30) and checked with speech recognition; `data/audio.js` maps each text to its clip, and the device voice is only a fallback. Real teacher recordings would still be best.
5. Each new grade or term: Carolina's outline → regenerate the data file.
