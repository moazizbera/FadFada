# FadFada Demo Video Transcript by Screenshot

Source screenshots: `scripts/demo-output/Screens/F_1.png` to `F_20.png`

Use this as a narration guide. Each shot includes a visual description, suggested voiceover, and optional on-screen/action cue.

## Judge-Focused Technical Thread

Use this as the repeated judging message throughout the video: FadFada is not only a UI demo. It is a role-aware AI product that uses Gemini services in different ways:

- **Gemini text reasoning:** companion replies, persona tone, parent guidance, child-safe responses, and structured reflection.
- **Gemini multimodal understanding:** parent uploads homework screenshots, and the system extracts the task, subject, child level, and learning steps.
- **Gemini structured JSON outputs:** homework activities, child-safe challenges, emotional cadence, media intent, and parent summaries are returned in predictable app-ready shapes.
- **Gemini image/media layer:** storyboard and visual-generation routes turn reflections or learning moments into visual artifacts.
- **Safety and context isolation:** parent and child sessions use separate prompts, separate storage scopes, and runtime leak guards so parent identity never enters the child experience.

If the video is for judges, mention one Gemini/API proof point every 3-4 screenshots instead of explaining every feature in full.

---

## F_1.png - Main FadFada Home and Chat Composer

**Visual description:**
The app opens on the main FadFada mobile experience. A companion avatar, Nora, is centered at the top with a calm orb and the headline: "FadFada is not a generic chat." The bottom navigation and fixed chat composer are visible, including Home, Chat, Breathe, Persona, Menu, remaining account gift replies, and quick media/voice/send controls.

**Voiceover:**
"FadFada starts as a calm, mobile-first AI companion. It is not a generic chat box. The user can write freely, choose a persona, breathe, open tools, or send a voice message from one focused screen."

**Judge/API note:**
This is the main Gemini chat surface. The backend sends the active mode, persona, language, world, and recent messages into the AI prompt.

**Action cue:**
Show the home screen, then draw attention to the bottom navigation and composer.

---

## F_2.png - Companion / Persona Drawer

**Visual description:**
The persona picker is open. It shows multiple AI companions, including philosophy, startup, business, planning, execution, and creator personas. Some companions are locked previews while Nora is available.

**Voiceover:**
"Instead of one flat assistant, FadFada gives users a roster of specialized companions. Each persona has a role, tone, and use case, from startup guidance to planning, investment thinking, creativity, and emotional support."

**Judge/API note:**
Personas are not just labels. Their system prompts are injected into Gemini so the same model behaves like different specialized companions.

**Action cue:**
Scroll or pause on the companion grid to show variety and locked/available states.

---

## F_3.png - AI Response with Current Topic

**Visual description:**
A user asks: "last news of world cup." Captain Kareem responds with a structured answer about World Cup news and current status. The assistant message appears inside the chat with the mobile composer still fixed at the bottom.

**Voiceover:**
"When the user asks a question, the active companion responds in context. Here, Captain Kareem switches into a direct, actionable style for sports information while preserving the same calm chat experience."

**Judge/API note:**
Gemini returns structured response metadata, including world, cadence, and optional media intent, so the UI can animate and route the answer correctly.

**Action cue:**
Show the user message and the assistant response beginning to scroll.

---

## F_4.png - Daily Pulse Check-In

**Visual description:**
The Menu panel is open on the Check-in tab. A Daily Pulse card asks, "How are you right now?" The user can select mood, energy, and need, then start today's check-in.

**Voiceover:**
"FadFada also includes structured reflection tools. Daily Pulse turns a simple mood, energy, and need check-in into a guided conversation, so users can understand their state and leave with one small next step."

**Judge/API note:**
The check-in is converted into prompt context for Gemini, not handled as a static form. The answer changes based on the user's selected state.

**Action cue:**
Highlight the Mood, Energy, and I need segmented controls.

---

## F_5.png - Demo Keys and Prompt Shortcuts

**Visual description:**
The Menu panel is open on the Prompts tab. It shows "Demo keys" with discoverable commands such as `/judge`, `/proof`, `/pitch`, `/launch`, and `/badge`.

**Voiceover:**
"For demos and power users, FadFada hides advanced flows behind clean shortcuts. With one tap, the app can run judge demos, create proof cards, generate a launch post, or prepare a pitch without cluttering the main chat."

**Action cue:**
Pause on the `/judge`, `/proof`, and `/pitch` options.

---

## F_6.png - Smart Continuity / Progress

**Visual description:**
The Progress tab shows "Continue your last thread?" It remembers the last topic, in this case World Cup news, and offers Continue, Save snapshot, and Start quest actions.

**Voiceover:**
"FadFada remembers meaningful threads locally and turns them into continuity. A user can continue a previous conversation, save a snapshot, or turn progress into a small quest."

**Action cue:**
Show the "Last thread" and "Next step" cards, then the three action buttons.

---

## F_7.png - Moment Actions Menu

**Visual description:**
A modal titled "Moment actions" appears over the blurred chat. It includes Saved, Tiny plan, Share reply, Proof card, Download capsule, Helpful, and Softer.

**Voiceover:**
"Every useful reply can become an artifact. Users can save it, turn it into a tiny plan, share it, generate a proof card, download a capsule, or ask for a softer next response."

**Judge/API note:**
AI output is not disposable. The app turns Gemini responses into reusable product artifacts: plans, proof cards, capsules, and shareable summaries.

**Action cue:**
Use this as a quick feature montage shot for post-response actions.

---

## F_8.png - Parent Fast Access Tools

**Visual description:**
A parent fast-access menu is open. It includes Homework transformer, Homework follow-up, Parent Playbook, and My kids plans. The chat remains visible behind it.

**Voiceover:**
"For parents, FadFada adds a family workspace. Parent tools are separate from the child experience and include homework transformation, follow-up, parenting playbooks, and child plans."

**Action cue:**
Emphasize that these tools are parent-only.

---

## F_9.png - Homework Transformer Upload Flow

**Visual description:**
A Homework transformer popup is open. It asks the parent to choose a child, upload an image or open the camera, select the child stage, add an optional note, and create/send the activity to the child.

**Voiceover:**
"The parent can upload a worksheet, take a camera photo, add a note, and send the activity directly into the selected child's workspace. The child never needs a separate login."

**Judge/API note:**
This is the multimodal Gemini moment: the parent can provide an image, and the backend asks Gemini to understand the homework and transform it.

**Action cue:**
Show the child selector, upload/open camera buttons, and "Create and send to child" button.

---

## F_10.png - Account Profile Children Tab

**Visual description:**
The Account profile page is open on the Children tab. It explains "Separate child spaces from one account" and describes separate spaces, conversation history, no child email/password, and parent confirmation for return.

**Voiceover:**
"Each child profile has its own safe space and separate conversation history under the parent's account. Children do not manage passwords, and returning to the parent profile requires parent confirmation."

**Action cue:**
Use this shot to explain role separation and safety architecture.

---

## F_11.png - Add Child Profile Form

**Visual description:**
An Add child modal is open. The parent enters a child-safe nickname, birth year, daily limit in minutes, and chooses a starter companion like Zain KG, Rami Riddles, or Deema Drama.

**Voiceover:**
"Creating a child profile is intentionally simple: a safe nickname, age information, time limit, and a starter companion. The goal is to create a child identity without exposing account credentials."

**Action cue:**
Highlight the nickname, birth year, daily limit, and companion choices.

---

## F_12.png - Homework Transformation Result

**Visual description:**
The Homework transformer shows an uploaded worksheet preview and a generated child-ready activity. It detects the subject as English, describes alphabet tracing and recognition, creates a child intro, and begins with an activity: "Trace the Letter C."

**Voiceover:**
"After upload, FadFada transforms the worksheet into child-ready activities. It understands the subject, explains the goal, creates a friendly intro, and breaks the homework into small playable steps."

**Judge/API note:**
Gemini output is parsed as structured homework JSON: detected task, subject, child intro, activities, hints, answers, choices, and visual metadata.

**Action cue:**
Show the original worksheet image and the generated activity card together.

---

## F_13.png - Child Workspace Home

**Visual description:**
The app is now in child mode for Rana. The active child companion is Deema Drama. The screen says: "Hi Rana" and explains this is a safe child space for stories, puzzles, learning, and children companions only. Buttons include Start playing, Stories, and Choose your friend.

**Voiceover:**
"When the parent switches to a child profile, the app becomes the child's space. The AI greets the child by name, uses child-safe companions only, and removes adult tools from the experience."

**Judge/API note:**
Child mode sends a different workspace context and server-enforced system prompt: child name, child age, child-safe language, and no parent identity leakage.

**Action cue:**
This is the key child identity shot. Pause long enough to show "Hi Rana" and the child-only actions.

---

## F_14.png - Child Homework Activity

**Visual description:**
A child homework challenge is open. It shows "Picture challenge" and question 1 of 3: "Trace the Letter C." The child can hear the question, answer by voice, or choose from answer buttons C, A, B, and D.

**Voiceover:**
"The homework becomes interactive. The child can hear the question, answer by voice, or tap an option. This turns a static worksheet into a guided learning game."

**Judge/API note:**
This is where multimodal understanding becomes interaction design: the worksheet is now a child-safe game with choices, checks, and progress.

**Action cue:**
Focus on the question, audio/voice controls, and answer choices.

---

## F_15.png - Story Journey Passport

**Visual description:**
A Story Journey Passport screen shows progress across books and minutes. It highlights the next adventure, "The Moon Key Riddle," and an adventure trail with multiple story cards.

**Voiceover:**
"The child workspace also includes a story passport. Finished stories become progress, and the child always has a safe next adventure ready to continue."

**Action cue:**
Show the progress counters and adventure trail.

---

## F_16.png - Story Library Cards

**Visual description:**
A vertical list of colorful story cards is shown, including The Moon Key Riddle, The Cloud Stage Show, Planet Popcorn, The Kindness Bridge, and The Button Bug Debug. Each card has age range and reading time.

**Voiceover:**
"Stories are organized as short, age-aware adventures. Each story has a theme, reading time, and playful learning goal, from kindness to science questions and beginner logic."

**Action cue:**
Scroll down the story list to show variety.

---

## F_17.png - Interactive Story Reader

**Visual description:**
The Planet Popcorn story is open as a story poster. Page 1 shows readable text, page controls, auto-read, stop reading, launch/ask/quiz buttons, and a "Start with story guide" button.

**Voiceover:**
"Each story can be read page by page, auto-read aloud, or turned into an interactive guided session. Children can launch a challenge, ask a question, or take a quiz from inside the story."

**Judge/API note:**
Story content can become a Gemini-guided chat session, preserving the active child companion and child-safe prompt rules.

**Action cue:**
Highlight page controls, auto-read, quiz, and story guide buttons.

---

## F_18.png - Guided Story in Chat

**Visual description:**
Back in chat, Amina Manners presents The Kindness Bridge as a story image card. The card includes story text and choice buttons like Pick kind words, Practice apology, and Repair the bridge.

**Voiceover:**
"Stories are not passive. A companion can guide the child through choices, values, and reflection, turning a story into a safe conversation and decision game."

**Action cue:**
Show the three choice buttons as examples of child-safe interaction.

---

## F_19.png - Child Companion Picker

**Visual description:**
The child companion picker shows children-only companions, including Zain, Rami Riddles, Deema Drama, Faris Focus, Nour Nature, Tariq Tales, Amina Manners, Sami Space, Leila Logic, and more.

**Voiceover:**
"Child mode has its own companion roster. Every companion is designed for children, with specialties like riddles, focus, manners, space, logic, breathing, nature, and creativity."

**Action cue:**
Use this shot to reinforce that adult personas are not available in child mode.

---

## F_20.png - Parent Pulse Snapshot and Return Code

**Visual description:**
The parent profile shows a return code, child activity history, and a Parent pulse snapshot for Rana. It displays low risk, seven-day activity, world, trend, last activity, and a suggested tonight's ritual.

**Voiceover:**
"Parents stay informed without invading the child's space. The parent dashboard shows activity signals, risk level, recent trends, and a suggested family ritual. Returning from child mode requires a parent return code."

**Judge/API note:**
The product separates parent oversight from child privacy: parents see summaries and signals, while child conversations stay scoped to the child profile.

**Action cue:**
End on this shot to show safety, parent oversight, and role separation.

---

# Final 3-Minute Judge Voiceover

Target length: about 2 minutes 45 seconds to 3 minutes at normal speaking speed. This is the version to record.

"FadFada is a mobile-first AI companion for Arabic and English families. It looks like a calm chat app, but underneath every request carries role, language, persona, world, and recent context.

The user can choose different companions. These are not just avatars. Each companion injects a different system prompt into Gemini, so the same model can act as a planner, coach, storyteller, creator, or emotional companion.

The app also turns AI replies into real product artifacts. A Gemini response can become a saved moment, tiny plan, proof card, downloadable capsule, or shareable summary. Daily Pulse adds structured check-ins, where mood, energy, and need become AI context, not just form data.

For parents, FadFada becomes a family workspace. A parent creates child profiles, sets limits, and uploads homework. This is where we use Gemini multimodal understanding: the system reads a worksheet image, detects the subject and task, then returns structured JSON with a child intro, activities, hints, choices, answers, and visual metadata.

The parent sends that transformed homework into the child's workspace. When the app switches to child mode, identity changes completely. The child is greeted by name, only child-safe companions appear, adult tools disappear, and Gemini receives a different server-side prompt: speak to this child, at this age, using simple safe language.

The worksheet becomes an interactive learning game with voice, choices, progress, stories, quizzes, and guided decisions. The child experience feels personal, but it stays separate from the parent account.

For judges, the technical point is simple: FadFada uses Gemini as a product engine, not only a chatbot. It combines text reasoning, multimodal homework understanding, structured JSON outputs, media and storyboard routing, and role-based safety prompts.

Parents still get oversight through summaries, risk signals, activity history, and return codes. But child conversations stay scoped to the child profile. The result is an AI app that knows exactly who it is speaking to: parent or child, without mixing their identities."

# Exact 3-Minute Screenshot Timing Plan

Use this to cut a 4:15 video down to 3:00. Keep the visual pace fast: about 7-10 seconds per group, not per screenshot.

| Time | Screens | Narration focus |
| --- | --- | --- |
| 0:00-0:22 | F_1-F_3 | Main chat, persona prompts, Gemini text reasoning |
| 0:22-0:48 | F_4-F_7 | Daily Pulse, shortcuts, artifacts from AI replies |
| 0:48-1:30 | F_8-F_12 | Parent workspace, child profiles, Gemini multimodal homework transformation |
| 1:30-2:28 | F_13-F_19 | Child identity, child-safe prompt, homework game, stories, companions |
| 2:28-3:00 | F_20 | Parent oversight, safety, role isolation, final judge message |

# What To Cut From The 4:15 Version

- Do not read every per-screenshot description aloud.
- Keep F_5-F_7 as a fast montage; one sentence covers all three.
- Keep F_15-F_19 as a fast child-experience montage; do not explain each story card.
- Remove pauses longer than 1 second between sections.
- Keep only one strong Gemini sentence in each block: text reasoning, multimodal image understanding, structured JSON, child-safe prompt isolation.

# One-Sentence Judge Hook

"FadFada is a role-aware family AI app that uses Gemini text, multimodal understanding, structured outputs, and child-safe prompt isolation to turn parent tasks and child learning into one connected but safely separated experience."
