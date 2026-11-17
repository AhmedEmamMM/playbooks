/* defaults.js: sample playbooks shown only on the very first run (when nothing is saved yet).
   Edit or delete them in the app. Nothing here overwrites saved data. */
window.PB = window.PB || {};
(function (PB) {
  "use strict";

  PB.DEFAULT_COLLECTIONS = function () {
    return [
      { name: "Website with AI", icon: "rocket", desc: "My 5-phase routine for building a full website with AI in under 3 hours.", steps: [
        { title: "Collect design references", note: "Find the look before designing anything.",
          actions: ["Open [Pinterest](pinterest.com) and search `saas dashboard ui light`", "Save 4–5 images you like (clean, lots of white space)", "Download them into a folder named `Design System Reference`"],
          links: [{ title: "Pinterest", url: "pinterest.com" }] },
        { title: "Build the design system", note: "Open the .pen file as a canvas, attach the references, then paste the prompt.",
          actions: ["Open `design/design_system_for_my_website.pen` in VS Code as a canvas", "Attach the `Design System Reference` folder to the chat", "Paste the prompt below"],
          prompt: "You are a senior product designer. Build a complete design system for my website\nas a single Pencil canvas, based on the reference images in the folder I attached.\n\n1. Color\n   - One primary accent with a 50–900 scale.\n   - A neutral scale with a slight cool bias (not pure grey).\n   - Semantic colors: success, warning, error, info, each with a soft tint.\n\n2. Typography\n   - Headings, body and mono fonts, with a clear type scale.\n\n3. Spacing, radius, shadow\n   - 4px base spacing scale. Radius 6 / 10 / 16 / 24 / pill.\n\n4. Components (each with default, hover, focus, disabled)\n   - Buttons, inputs, search, sidebar item, chip, toast, prompt block with Copy.\n\nLay it out as one poster frame, 1440px wide, and name every layer clearly." },
        { title: "Design the components", note: "Copy component prompts from 21st.dev and adapt them to the design system.",
          prompt: "Take this component prompt from 21st.dev and restyle it with my design tokens (colors, type, radius, spacing).\nKeep the structure and interactions, swap every hard-coded value for a token,\nand return it as a reusable Pencil component with hover and focus states.",
          links: [{ title: "21st.dev", url: "21st.dev" }] },
        { title: "Check page speed", note: "Run Lighthouse and fix anything under 90.",
          actions: ["Open the site in Chrome", "Press `F12` → Lighthouse → Analyze page load"],
          prompt: "Here is my Lighthouse report. Fix every issue scoring under 90, starting with the biggest impact. Explain each change in one line." },
        { title: "SEO audit", prompt: "Audit this page for on-page SEO: title, meta description, headings, alt text,\nOpen Graph tags, canonical URL and structured data. List issues by impact and give the exact fix for each." }
      ]},
      { name: "Deployment", icon: "globe", desc: "Shipping apps to production.", steps: [
        { title: "Create the project", note: "Start from a clean, working baseline.", prompt: "npx create-next-app@latest my-app --ts --app --tailwind" },
        { title: "Configure environment", note: "Keep keys out of git.", prompt: "Create .env.local with NEXT_PUBLIC_API_URL and DATABASE_URL, then add the same variables in Vercel → Settings → Environment Variables.", links: [{ title: "Environment variables guide", url: "vercel.com/docs/projects/environment-variables" }] },
        { title: "Deploy to production", prompt: "vercel --prod" }
      ]},
      { name: "Database", icon: "database", desc: "Schema, migrations and query snippets.", steps: [
        { title: "Model a table", prompt: "Add a Prisma model called Post with id, title, body, authorId and createdAt fields." },
        { title: "Seed sample data", prompt: "Write a prisma/seed.ts that inserts 5 sample posts, then run: npx prisma db seed" }
      ]},
      { name: "AI prompts", icon: "sparkles", desc: "Reusable prompts for vibe coding sessions.", steps: [
        { title: "Generate a screen", prompt: "Build a responsive [screen] with [sections], using our design tokens and Lucide icons. Mobile-first, accessible, no placeholder lorem." }
      ]}
    ];
  };
})(window.PB);
