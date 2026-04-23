"use client";

import { useState } from "react";
import Link from "next/link";
import MarketingNav from "@/components/marketing-nav";
import MarketingFooter from "@/components/marketing-footer";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  paragraphs: string[];
}

/**
 * Blog posts are stored here as static data.
 * Sorted newest-first. Each post has a slug, title, date, and array of paragraph strings.
 * To add a new post, add it to the top of this array.
 */
const POSTS: BlogPost[] = [
  {
    slug: "birthday-gift-best-practices",
    title: "What Actually Makes a Great Birthday Gift (According to the Research)",
    date: "2026-04-22",
    paragraphs: [
      "Most of us overthink birthday gifts. We spend hours browsing, second-guessing ourselves, and often land on something safe but forgettable. Meanwhile, research on gift-giving suggests that the things we stress about most — originality, surprise, the \"wow factor\" — aren't what recipients actually care about.",
      "A 2016 study published in the Journal of Experimental Psychology found a consistent gap between what givers and receivers value. Givers tend to prioritize the moment of unwrapping: they want to see a big reaction. Recipients, on the other hand, care more about long-term usefulness. That impressive gadget you agonized over? It might get a smile on the day and collect dust for the next year. The comfortable slippers they mentioned needing? Those get worn every single day.",
      "This doesn't mean practical gifts are always the answer. It means paying attention is. The best gifts tend to come from something the person actually said — an offhand comment about a book they wanted to read, a hobby they've been meaning to try, a restaurant they keep hearing about. Psychologist Ellen Langer calls this \"mindful attention,\" and it's the quality that separates a thoughtful gift from an expensive one.",
      "Timing matters more than most people realize, too. A study from the University of Cincinnati found that gifts given slightly before the occasion — arriving early enough that the person can enjoy them during their birthday week, rather than unwrapping them at a party — were rated as more thoughtful. There's a sweet spot: early enough to show you planned ahead, but close enough that it feels personal and timely. Three weeks out is when most people start thinking about it. One week out is when most people start panicking.",
      "Budget is another area where perception doesn't match reality. Research from the National Retail Federation puts the average birthday gift spend at around $50 to $75 for close friends and family. But multiple studies have shown that recipients can't reliably tell the difference between a $30 gift and a $90 gift in terms of how appreciated it feels. What they can tell is whether you put thought into it. A $20 book that perfectly matches their taste beats a $100 item that doesn't.",
      "One pattern worth noting: consumable gifts — food, wine, candles, experience vouchers — tend to be underrated by givers and overrated by receivers. People hesitate to give something that \"disappears,\" but recipients consistently report higher satisfaction with consumable gifts than with physical objects. Part of this is the clutter factor. Most adults already own more things than they need. A great bottle of wine or a dinner reservation creates a memory without adding to the pile.",
      "Group gifts are worth considering more often than people do. Pooling with two or three people lets you get something genuinely useful — a piece of luggage, a kitchen tool, a subscription the person would never buy themselves — without any single person overspending. The key is having one person take the lead on choosing the item. Gift-by-committee rarely works well.",
      "The worst gifts, according to survey data, share a common trait: they signal that the giver didn't think about the recipient at all. Generic bath sets. Gift cards to stores the person never shops at. Anything that feels like it was grabbed in a hurry at the checkout line. People don't expect perfection, but they do notice when zero effort was involved.",
      "If there's a single takeaway from the research, it's this: start earlier, listen more, and stop worrying about being impressive. The gifts people remember years later aren't the most expensive or the most creative — they're the ones that made the person feel known. That's a low bar to clear, but most of us keep tripping over it because we're optimizing for the wrong thing.",
      "At Daysight, this is basically our whole philosophy. We remind you early enough to think, and we suggest gifts based on what you've told us about each person. No last-minute panic, no generic fallbacks. Just a nudge at the right time with an idea that actually fits.",
    ],
  },
];

function formatBlogDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function BlogPostCard({ post }: { post: BlogPost }) {
  const [expanded, setExpanded] = useState(false);
  const previewParagraphs = post.paragraphs.slice(0, 2);
  const remainingParagraphs = post.paragraphs.slice(2);

  return (
    <article className="bg-white rounded-2xl border border-gray-100 p-8 md:p-10">
      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-2">{formatBlogDate(post.date)} · Daysight</p>
        <h2 className="text-xl font-bold text-gray-900 leading-snug">{post.title}</h2>
      </div>
      <div className="space-y-4 text-gray-600 leading-relaxed">
        {previewParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {!expanded && remainingParagraphs.length > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-brand-600 hover:text-brand-700 font-medium text-sm"
          >
            Show more
          </button>
        )}
        {expanded &&
          remainingParagraphs.map((p, i) => (
            <p key={`r-${i}`}>{p}</p>
          ))}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="text-brand-600 hover:text-brand-700 font-medium text-sm"
          >
            Show less
          </button>
        )}
      </div>
    </article>
  );
}

export default function BlogPage() {
  return (
    <>
      <MarketingNav />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog</h1>
          <p className="text-gray-500">Thoughts on gifting, relationships, and never missing the big days.</p>
        </div>

        <div className="space-y-8">
          {POSTS.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
