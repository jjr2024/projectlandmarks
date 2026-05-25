# Daysight Project

## Overview
Email-first birthday/gift reminder service. Users enter contacts + dates, pick gift preferences, get reminder emails with affiliate gift links. Revenue from affiliate commissions. Domain: daysight.xyz.

## Stack
Next.js 14 (App Router), Supabase (Postgres + Auth + RLS), Resend (transactional email), Vercel (hosting + cron). TypeScript strict mode.

## Current Phase
Production-ready (Phases 1–9 complete). Active work on adding product images to reminder emails (was text-only).

## Gift Catalog
- XLS is source of truth: "Daysight Manual Amazon Inputs - XLS Format_v3.0.xlsx" (72 items as of May 2026)
- Partners: Amazon, UrbanStems, Wine.com
- DB table: `gift_catalog` with `image_url` column (exists but unused in emails until now)
- Engine: deterministic weighted scoring in `src/lib/gift-engine.ts`, no LLM

## Key Architecture Decisions
- Reminder emails include product images (200px with 8px rounded corners, retina 2× from 400px source)
- Images self-hosted at `daysight.xyz/gifts/{slug}.jpg` — Amazon CDN URLs cannot be hotlinked in emails (blocked in non-browser contexts)
- XLS `image_url` column = Amazon CDN source URL (used by download script only, never in emails)
- DB `gift_catalog.image_url` = self-hosted absolute URL used in emails
- Gift catalog has internal-reference XLS columns not used by webapp: is_active, asin, current_price, star_rating, review_count, last_updated, affiliate
- XLS `clean_affiliate_url` column is what gets seeded to DB (not `affiliate_url`)
- XLS `description` column is source of truth for product copy
