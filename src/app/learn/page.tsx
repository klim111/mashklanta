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
} from 'lucide-react';
import NavBar from '@/components/ui/navbar';
import Footer from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import TopicSection from '@/components/how-it-works/TopicSection';
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

const topicNav = [
  { id: 'intro', label: 'יסודות' },
  { id: 'interest-tracks', label: 'מסלולי ריבית' },
  { id: 'mix', label: 'תמהיל' },
  { id: 'journey', label: 'מסע המשכנתא' },
  { id: 'tips', label: 'טיפים' },
];

export default function LearnPage() {
  const [activeNav, setActiveNav] = useState('intro');

  useEffect(() => {
    const sections = topicNav.map((t) => document.getElementById(t.id)).filter(Boolean);
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
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 text-white px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-float-slow" />
          {/* 3D grid floor effect */}
          <div
            className="absolute bottom-0 left-0 right-0 h-48 opacity-20"
            style={{
              background:
                'linear-gradient(180deg, transparent, rgba(0,0,0,0.3)), repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 60px)',
              transform: 'perspective(400px) rotateX(60deg)',
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
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-2 rounded-full text-sm font-medium mb-6">
            <GraduationCap className="w-4 h-4" />
            מרכז למידה — משכלתנא
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            להבין משכנתא
          </h1>
          <p className="text-lg md:text-xl text-blue-100 leading-relaxed mb-8">
            מסע לימודי אינטראקטיבי — מהבסיס ועד מסלולי הריבית.
            גללו בין כרטיסיות תלת-מימדיות בכל נושא.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="bg-white text-indigo-700 hover:bg-blue-50"
            >
              <a href="#interest-tracks">
                <Layers className="w-5 h-5 ml-2" />
                מסלולי ריבית
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/40 text-white hover:bg-white/10"
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

      {/* Sticky topic nav */}
      <nav className="sticky top-[72px] z-40 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
          <ul className="flex gap-1 py-3 min-w-max justify-center">
            {topicNav.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`block px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeNav === item.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
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
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              מוכנים ליישם את מה שלמדתם?
            </h2>
            <p className="text-gray-600 mb-8">
              השתמשו בכלים האינטראקטיביים שלנו לבניית תמהיל, סימולציות ותכנון משכנתא.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/mortgage-planning">
                  תכנון משכנתא
                  <ChevronLeft className="w-5 h-5 mr-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/simulations">סימולציות</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
