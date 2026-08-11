# Pulse Chat

Build Brief — “Pulse” Animated Messaging App



Build a polished, modern small-scale WhatsApp-inspired messaging application called Pulse.



The goal is NOT to copy WhatsApp visually. Create an original messaging experience where chatting is the central feature, but the entire application feels much more alive, fluid, expressive, and animated than traditional messaging apps.



The app should feel like a real product—not a static prototype.



---



1. Core Product Philosophy



The most important part of the application is conversation.



When users open the app, they should immediately feel that messaging is fast, pleasant, expressive, and alive.



Prioritize:



1. Messaging

2. Conversation experience

3. Contacts and presence

4. Media sharing

5. Notifications

6. Smooth animations and micro-interactions

7. Lightweight additional features



Do NOT overload the application with unnecessary features.



The product should feel small, focused, fast, and addictive to use.



---



2. Main Navigation



Use a simple mobile-first navigation system.



Primary sections:



- Chats

- Contacts

- Updates

- Calls

- Profile / Settings



The Chats section should be the default landing screen.



Use a floating action button for starting a new conversation.



---



3. Chat List



Create a beautiful animated chat list.



Each conversation should display:



- Profile picture

- Contact name

- Last message

- Timestamp

- Unread message count

- Online/typing indicator

- Muted indicator when applicable

- Small media/message-type indicator



Animations



The chat list should have subtle motion:



- Conversations smoothly animate into position.

- New messages cause a gentle highlight.

- Unread counters animate when changing.

- Swipe gestures should feel natural.

- Pressing a conversation creates a subtle scale/ripple interaction.

- Use spring-based animations rather than robotic linear transitions.



Avoid excessive animation that makes the interface slow.



---



4. Chat Screen — MOST IMPORTANT FEATURE



Make the conversation screen the strongest part of the entire application.



The chat screen should feel extremely polished.



Include:



- Message bubbles

- Text messages

- Emoji

- Images

- Videos

- Voice messages

- Files

- Reply to message

- Message reactions

- Message editing

- Message deletion

- Copy message

- Forward message

- Pin message

- Message timestamps

- Read receipts

- Typing indicator

- Online status

- Search within conversation



---



5. Message Bubble Design



Do NOT simply copy WhatsApp's bubbles.



Create an original visual language.



Messages should have:



- Smooth rounded corners

- Subtle depth

- Excellent typography

- Clear distinction between sender and receiver

- Elegant timestamps

- Small read-status indicators



Message animations



When a message is sent:



1. The message appears with a subtle spring animation.

2. It slightly scales from 96% → 100%.

3. It settles naturally into the conversation.

4. The chat scroll position adjusts smoothly.



When receiving a message:



- The message gently enters from below.

- Avoid aggressive sliding animations.



When reacting to a message:



- The emoji reaction should pop slightly.

- Add a tiny spring/bounce effect.



---



6. Sending Messages



The composer should be extremely polished.



Include:



- Text input

- Emoji button

- Attachment button

- Camera button

- Voice recording button

- Send button



The send button should intelligently change depending on the input.



For example:



Empty:



[🎤]



Text entered:



[➤]



The transition between these states should be animated.



---



7. Voice Messages



Create a beautiful voice-message interface.



Users should be able to:



- Hold to record

- Slide to cancel

- Lock recording

- Release to send

- Play/pause recordings

- See waveform visualization

- See duration



The waveform should animate while the message is playing.



---



8. Typing Experience



Make typing feel alive.



When someone is typing:



Show:



“Alex is typing…”



with an animated three-dot indicator.



For multiple people:



“Alex and Sarah are typing…”



The typing indicator should have a subtle pulsing animation.



---



9. Message Reactions



Allow users to long-press a message.



Display an animated reaction bar:



❤️ 😂 👍 😮 😢 🔥



Also provide:



“＋”



for additional emojis.



The reaction selector should appear with a smooth spring animation.



---



10. Reply Interaction



When replying to a message:



Show a small preview above the composer.



Example:



Replying to Alex



«Are you coming tonight?»



Allow the user to cancel the reply.



When the sent reply is tapped, smoothly scroll to the original message and briefly highlight it.



---



11. Media



Allow conversations to contain:



- Photos

- Videos

- GIFs

- Documents

- Voice messages

- Location

- Contacts



Create an attractive media viewer.



Images should open fullscreen with:



- Smooth zoom

- Swipe navigation

- Download/share options

- Close gesture



---



12. Camera



Add a simple camera interface.



Users can:



- Take a photo

- Record a short video

- Switch front/back camera

- Send directly to the conversation



Do not build an overly complicated camera application.



---



13. Contacts



Create a clean Contacts screen.



Features:



- Search

- Profile pictures

- Name

- Online status

- Start conversation button



Contact profiles should contain:



- Profile picture

- Name

- About/status

- Online status

- Shared media

- Shared files

- Search messages

- Mute

- Block

- Report



---



14. Updates / Stories



Add a lightweight Stories-style feature.



Users can post:



- Text

- Photo

- Video



Stories should appear as animated circular profile cards.



Include:



- Viewed/unviewed state

- Story viewer

- Reply to story

- Reaction



Keep this feature secondary to messaging.



---



15. Calls



Add basic:



- Voice calls

- Video calls



For the initial version, the UI can be prepared for real-time calling infrastructure.



If real WebRTC calling is practical with the selected backend, implement it.



Otherwise, create a clean architecture where WebRTC can be integrated later.



---



16. Search



Create global search.



Users should be able to search:



- Contacts

- Conversations

- Messages

- Media

- Files



Inside a conversation, searching should highlight matching messages.



---



17. Notifications



Implement notifications for:



- New messages

- Mentions

- Calls

- Reactions

- Replies



Unread counts should update instantly.



---



18. Presence System



Support:



- Online

- Offline

- Last seen

- Typing

- Recording audio

- Recently active



Presence should update in real time.



---



19. Profile



Create a simple profile page.



Show:



- Profile picture

- Name

- Username

- About

- Phone number

- QR code



Allow editing profile information.



---



20. Settings



Include:



Account



- Profile

- Privacy

- Security



Chats



- Chat wallpaper

- Enter key behavior

- Media auto-download

- Archived chats



Notifications



- Message notifications

- Sound

- Vibration



Appearance



- Light mode

- Dark mode

- System theme

- Chat bubble appearance



Privacy



- Last seen

- Online status

- Read receipts

- Profile photo visibility

- Status visibility



---



21. Add One Original Feature



Create an original feature that makes Pulse different from WhatsApp.



“Mood”



Users can optionally select a current mood:



😊 Happy

😴 Tired

🔥 Energetic

😔 Sad

🎧 Listening

📚 Studying

🎮 Gaming



A small animated mood indicator can appear beside their profile.



Make this optional and unobtrusive.



---



22. Animation System



Animation is one of the defining characteristics of this application.



Use animation throughout the UI, but maintain excellent performance.



Use:



- Spring animations

- Fade transitions

- Scale transitions

- Shared-element transitions

- Gesture-based interactions

- Smooth scrolling

- Micro-interactions

- Skeleton loading

- Animated icons



Examples:



Opening a chat:



Chat card → smoothly expands/transitions into chat screen.



Sending a message:



Composer → message bubble with spring animation.



Opening profile:



Avatar → expands smoothly into profile header.



Opening media:



Thumbnail → fullscreen image transition.



Reaction:



Emoji → small bounce/pop animation.



Navigation:



Pages should transition naturally instead of instantly disappearing.



IMPORTANT:



Do not make every element constantly move.



Animation should communicate interaction and state.



---



23. Visual Design



Design language:



Modern + minimal + expressive + futuristic



Use:



- Clean typography

- Generous spacing

- Rounded cards

- Soft shadows

- Beautiful icons

- Subtle gradients

- High-quality dark mode

- Smooth transitions



Avoid:



- Clutter

- Excessive glassmorphism

- Excessive gradients

- Huge text

- Cheap-looking neon effects

- Overly complicated dashboards



The application should look like a premium 2026 mobile product.



---



24. Dark Mode



Dark mode should be designed independently rather than simply inverting colors.



Use deep neutral backgrounds with carefully chosen accent colors.



Messages should remain highly readable.



Animations should remain subtle and elegant.



---



25. Backend



Build the application as a REAL full-stack application.



Use:



Frontend



- React

- TypeScript

- Tailwind CSS

- Modern component architecture

- Framer Motion or an equivalent animation library



Backend

Prefer:



- Supabase

- PostgreSQL

- Supabase Authentication

- Supabase Realtime

- Supabase Storage



Use real authentication and a real database.



Do NOT hard-code conversations.



---



26. Database



Create appropriate tables such as:



users

profiles

contacts

conversations

conversation_members

messages

message_reactions

message_attachments

message_reads

stories

story_views

notifications

calls

blocked_users

user_settings



Design the database so it can scale beyond the prototype.



---



27. Authentication



Implement:



- Sign up

- Login

- Logout

- Password reset

- Session persistence



If phone authentication is practical, support it.



Otherwise use email authentication initially.



Protect authenticated routes.



---



28. Real-Time Messaging



Messages must update in real time.



If User A sends a message:



User B should see it immediately without refreshing the page.



Also make these real-time:



- Typing indicators

- Online status

- Read receipts

- Reactions

- Message edits

- Message deletion



---



29. Security



Implement proper:



- Authentication

- Authorization

- Database Row Level Security

- Input validation

- File upload validation

- Protected API operations

- Permission checks



Users should only be able to access conversations they belong to.



Never expose private database credentials in frontend code.



---



30. Responsive Design



The primary target is mobile.



It must work beautifully on:



- Android phones

- iPhones

- Tablets

- Desktop browsers



On mobile, use native-feeling gestures and navigation.



On desktop, use a layout similar to:



Sidebar | Conversation | Optional details panel



But do NOT simply stretch the mobile interface.



---



31. Performance



This is important.



The application should remain fast even with large conversations.



Implement:



- Lazy loading

- Image optimization

- Message pagination

- Virtualized message lists when necessary

- Efficient realtime subscriptions

- Debounced search

- Optimized animations



Avoid unnecessary rerenders.



---



32. Empty States



Create beautiful empty states.



Examples:



No conversations:



“Your conversations are waiting.”



Start chatting.



No search results:



“No messages found.”



Make empty states feel intentional rather than unfinished.



---



33. Loading States



Never show a blank screen while something loads.



Use:



- Skeleton screens

- Animated placeholders

- Smooth transitions



---



34. Error Handling



Create friendly error states.



Never expose technical errors such as:



“Supabase query failed.”



Instead:



“Something went wrong. Try again.”



Provide retry actions.



---



35. Code Quality



Use:



- TypeScript

- Reusable components

- Clear folder structure

- Strong typing

- Reusable hooks

- Separation of UI and business logic

- Environment variables

- Clean API/data layer



Do not put the entire application inside one huge component.



---



36. Build Strategy



Build this in phases.



Phase 1 — Foundation



- Project setup

- Authentication

- Database

- Profiles

- Navigation

- Responsive layout



Phase 2 — Messaging



- Conversations

- Real-time messages

- Sending/receiving

- Read receipts

- Typing indicators

- Message reactions

- Reply

- Delete/edit



Phase 3 — Media



- Image uploads

- Video uploads

- Files

- Voice messages

- Media viewer



Phase 4 — Social



- Contacts

- Stories/Updates

- Presence

- Notifications



Phase 5 — Calls



- Voice/video calling architecture

- WebRTC if feasible



Phase 6 — Polish



- Animation

- Gestures

- Dark mode

- Loading states

- Error handling

- Performance optimization

- Accessibility



---



37. Critical Instruction to the AI Developer



Do NOT build a fake frontend prototype.



The final application must have real working functionality.



Do not create buttons that only look functional.



For every major feature:



1. Build the UI.

2. Connect it to the appropriate logic.

3. Connect it to the database/backend.

4. Test the interaction.

5. Fix errors before moving on.



If a feature cannot realistically be implemented in the current environment, clearly isolate it behind a clean interface rather than pretending it works.



---



38. Final Quality Standard



Before considering the application complete, test:



- Registration

- Login

- Logout

- Creating conversations

- Sending messages

- Receiving messages

- Typing indicators

- Read receipts

- Reactions

- Replies

- Editing messages

- Deleting messages

- Media uploads

- Voice messages

- Search

- Notifications

- Profile editing

- Dark mode

- Mobile responsiveness

- Desktop responsiveness

- Refresh persistence

- Error states



The final result should feel like a small, premium, animated messaging platform, not a WhatsApp clone and not a generic CRUD application.



The chat experience is the heart of the product.



Make the messaging experience exceptionally polished.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://animate-talk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/574c6188-6a4f-4ab3-82f1-20d3219c3f93).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
