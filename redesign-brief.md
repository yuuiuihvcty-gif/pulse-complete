# Pulse Chat redesign implementation brief

## Direction
Rework the existing Pulse Chat application into a premium, dark, animated mobile-first communication product matching the supplied redesign reference. Preserve all existing product behavior and route structure; change the visual system, hierarchy, surfaces, navigation treatment, and motion.

## Visual language
Use a deep near-black foundation with layered charcoal surfaces, restrained transparency, blur, soft glow, and thin luminous separators. Replace the current citrus-green identity with a controlled neon gradient family: electric blue/cyan through violet/purple into magenta/pink. Keep gradients local to active states, primary actions, presence rings, story rings, waveform accents, and selected highlights rather than flooding every surface.

Use a modern rounded sans-serif hierarchy with strong editorial titles and compact metadata. Favor moderate 16–24px radii by component, crisp circular avatars with gradient rings, soft shadows, and a small coherent line-icon family. Avoid robots, mascots, illustrations, stock imagery, giant decorative headers, and generic pill-everything styling.

## Shell and navigation
Create a responsive app canvas that feels like one connected product. On mobile, use an elevated translucent bottom navigation with five destinations: Chats, People, Updates, Calls, and You. The active item should have a gradient surface or indicator plus a visible label transformation. On desktop, use a compact left rail with the same identity and active-state behavior. Preserve safe-area padding and keyboard-aware spacing.

## Screen treatments
Authentication should use an atmospheric animated pulse field with a polished integrated form rather than a plain card. Chats should prioritize a compact inbox header, search, story/presence circles, crisp conversation rows, unread states, and compact timestamps. Chat detail should use a lightweight header, refined incoming/outgoing messages, media cards, voice waveform, delivery states, and an integrated composer. Updates should use gradient story rings, a polished story viewer, and concise empty states. Calls should share the same row hierarchy and neon state language. Profile and settings should use a crisp identity header and organized glass sections.

## Motion
Use quick, interruptible transitions: page fade/slide, staggered list entry, active-navigation shared movement, gradient breathing glow, waveform bars, pressed-state scale, and gentle presence animation. Respect prefers-reduced-motion.

## Acceptance criteria
The app must build with the existing static Pages workflow, retain authentication, chats, contacts, updates, calling, notifications, account management, global search, and unique IDE functionality, and be redeployed to the existing GitHub Pages URL after validation.
