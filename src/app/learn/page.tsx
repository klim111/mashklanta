'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronLeft,
  Compass,
  GraduationCap,
  Layers,
  ArrowDown,
  BookOpen,
  PieChart,
  Route,
  Lightbulb,
} from 'lucide-react';
import NavBar from '@/components/ui/navbar';
import Footer from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import TopicSection from '@/components/how-it-works/TopicSection';
import { LearnStageRail, type LearnStage } from '@/components/how-it-works/LearnStageRail';
import { learnTopics } from '@/data/how-it-works/topics';
import { interestTracks } from '@/data/how-it-works/interestTracks';
import type { CarouselCardData } from '@/components/how-it-works/CardCarousel3D';

const trackCards: CarouselCardData[] = interestTracks.map((t) => ({
  id: t.id,
  title: t.title,
  shortTitle: t.shortTitle,
  description: t.description,
  advantages: t.advantages,
  risks: t.risks,
  icon: t.icon,
  gradient: t.gradient,
  tag: t.tag,
}));

const learnStages: LearnStage[] = [
  { id: 'intro', number: 1, shortTitle: 'יסודות', icon: BookOpen, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'interest-tracks', number: 2, shortTitle: 'מסלולי ריבית', icon: Layers, gradient: 'from-blue-500 via-indigo-600 to-violet-700' },
  { id: 'mix', number: 3, shortTitle: 'תמהיל', icon: PieChart, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'journey', number: 4, shortTitle: 'מסע המשכנתא', icon: Route, gradient: 'from-orange-500 to-amber-600' },
  { id: 'tips', number: 5, shortTitle: 'טיפים', icon: Lightbulb, gradient: 'from-purple-500 to-fuchsia-600' },
];

export default function LearnPage() {
  const [activeNav, setActiveNav] = useState('intro');

  useEffect(() => {
    const sections = learnStages.map((t) => document.getElementById(t.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveNav(visible[0].target.id);
        }
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5] }
    );
    sections.forEach((s) => s && observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <NavBar />
      </div>

      {/* Hero */}
      <section className="relative min-h-[62vh] sm:min-h-[72vh] lg:min-h-[78vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 right-[8%] h-[26rem] w-[26rem] rounded-full bg-blue-500/20 blur-3xl animate-blob" />
          <div className="absolute bottom-[-6rem] left-[6%] h-[30rem] w-[30rem] rounded-full bg-violet-500/20 blur-3xl animate-blob [animation-delay:3s]" />
          <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
          <div
            className="absolute bottom-0 left-0 right-0 h-48 opacity-25"
            style={{
              background:
                'linear-gradient(180deg, transparent, rgba(0,0,0,0.4)), repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(0deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 64px)',
              transform: 'perspective(420px) rotateX(62deg)',
              transformOrigin: 'bottom',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative text-center max-w-3xl z-10"
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            <GraduationCap className="w-4 h-4" />
            מרכז למידה — משכלתנא
          </div>
          <h1 className="mb-6 text-3xl font-black leading-[1.15] text-white sm:text-4xl md:text-6xl">
            להבין משכנתא
            <br />
            <span className="bg-gradient-to-l from-cyan-200 via-sky-100 to-violet-200 bg-clip-text text-transparent">
              לפני שחותמים בבנק
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-100 md:text-xl">
            מסע לימודי אינטראקטיבי — מהבסיס ועד מסלולי הריבית.
            גללו בין כרטיסיות תלת-מימדיות בכל נושא.
          </p>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {learnStages.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition-colors hover:bg-white/25"
              >
                {item.shortTitle}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900"
            >
              <a href="#interest-tracks">
                <Layers className="w-5 h-5 ml-2" />
                מסלולי ריבית
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-white/40 bg-white/15 px-8 text-base font-bold text-white shadow-none hover:bg-white/25 hover:text-white"
            >
              <Link href="/how-it-works">
                <Compass className="w-5 h-5 ml-2" />
                איך הפלטפורמה עובדת
              </Link>
            </Button>
          </div>
        </motion.div>

        <motion.a
          href="#intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 text-white/70 hover:text-white"
          aria-label="גלול להתחלה"
        >
          <ArrowDown className="w-8 h-8 animate-bounce" />
        </motion.a>
      </section>

      {/* Sticky stage rail — כמו בכלי תכנון המשכנתא */}
      <nav className="sticky top-14 z-40 overflow-hidden bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.45)] md:top-[72px]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-600/25 blur-3xl" />
          <div className="absolute -left-16 top-0 h-40 w-40 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-3 py-3 md:px-6">
          <LearnStageRail stages={learnStages} current={activeNav} />
        </div>
      </nav>

      {/* Intro */}
      <TopicSection
        id={learnTopics[0].id}
        title={learnTopics[0].title}
        subtitle={learnTopics[0].subtitle}
        icon={learnTopics[0].icon}
        gradient={learnTopics[0].gradient}
        cards={learnTopics[0].cards.map((c) => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          body: c.body,
          highlights: c.highlights,
          icon: c.icon,
          gradient: c.gradient,
        }))}
        variant="simple"
        index={0}
      />

      {/* Interest tracks — featured section */}
      <TopicSection
        id="interest-tracks"
        title="מסלולי ריבית קיימים"
        subtitle="9 מסלולים עיקריים בשוק המשכנתאות הישראלי — גללו בין הכרטיסיות כדי להכיר כל אחד"
        icon={Layers}
        gradient="from-blue-500 via-indigo-600 to-violet-700"
        cards={trackCards}
        variant="track"
        index={1}
      />

      {/* Remaining topics */}
      {learnTopics.slice(1).map((topic, i) => (
        <TopicSection
          key={topic.id}
          id={topic.id}
          title={topic.title}
          subtitle={topic.subtitle}
          icon={topic.icon}
          gradient={topic.gradient}
          cards={topic.cards.map((c) => ({
            id: c.id,
            title: c.title,
            subtitle: c.subtitle,
            body: c.body,
            highlights: c.highlights,
            icon: c.icon,
            gradient: c.gradient,
          }))}
          variant="simple"
          index={i + 2}
        />
      ))}

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-800 to-violet-900 py-20 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              מוכנים ליישם את מה שלמדתם?
            </h2>
            <p className="text-slate-100 mb-8 text-lg leading-relaxed">
              השתמשו בכלים האינטראקטיביים שלנו לבניית תמהיל ותכנון משכנתא.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900"
              >
                <Link href="/mortgage-planning">
                  תכנון משכנתא
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border border-white/40 bg-white/15 px-8 text-base font-bold text-white shadow-none hover:bg-white/25 hover:text-white"
              >
                <Link href="/mortgage-advisor">בניית תמהיל</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
