/**
 * HANASO-IR owner fix (2026-11-19, item 3): the standalone /practice hub is
 * REMOVED from the app structure — practice lives in the learning journey's
 * own exercise stations (stn-kana-p1..p4, executed by the ONE StationRunner;
 * the in-station exercises are untouched). This file stays only as a redirect
 * so old bookmarks/links land on the journey map (where the same practice
 * stations are already rows) instead of a 404.
 */
import { redirect } from 'next/navigation';

export default function PracticePage() {
  redirect('/learn/kana-foundation-01/journey');
}
