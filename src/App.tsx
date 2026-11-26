import React, { useEffect, useState } from 'react';
import { Lock, LogOut, User } from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { AdminPage } from './pages/AdminPage';
import { CampaignPage } from './pages/CampaignPage';
import { GaragePage } from './pages/GaragePage';
import { MainMenuPage } from './pages/MainMenuPage';
import { RandomRacePage } from './pages/RandomRacePage';
import { SettingsPage } from './pages/SettingsPage';
import { ShopPage } from './pages/ShopPage';
import { computeDeckRqSample, getLevelProgress } from './engine/progression';
import { GameProvider, useGame } from './state/gameStore';
import { AppRoute } from './types/game';

const VALID_ROUTES: AppRoute[] = [
  '/mainmenu.php',
  '/garage.php',
  '/shop.php',
  '/campaign.php',
  '/challenges.php',
  '/random_race.php',
  '/settings.php',
  '/admin.php',
];

function resolveInitialRoute(): AppRoute {
  const path = window.location.pathname as AppRoute;
  if (VALID_ROUTES.includes(path)) {
    return path;
  }
  return '/mainmenu.php';
}

const AppShell: React.FC = () => {
  const { profile, authUser, logout, randomRaceUnlocked } = useGame();
  const [route, setRoute] = useState<AppRoute>(() => resolveInitialRoute());
  const lvlInfo = getLevelProgress(profile.xp ?? 0);
  const deckRqSample = computeDeckRqSample(profile.garage, profile.rqLevel);

  useEffect(() => {
    if (window.location.pathname === '/' || !VALID_ROUTES.includes(window.location.pathname as AppRoute)) {
      window.history.replaceState({}, '', '/mainmenu.php');
    }
    const handlePopState = () => {
      setRoute(resolveInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextRoute: AppRoute) => {
    if (nextRoute !== route) {
      window.history.pushState({}, '', nextRoute);
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navLinks: { label: string; href: AppRoute }[] = [
    { label: 'Hlavné menu', href: '/mainmenu.php' },
    { label: 'Garáž', href: '/garage.php' },
    { label: 'Obchod', href: '/shop.php' },
    { label: 'Kampaň', href: '/campaign.php' },
    { label: 'Nastavenia', href: '/settings.php' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: AppRoute) => {
    e.preventDefault();
    navigate(href);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0F14] text-slate-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="border-b border-slate-800/90 bg-[#10141C]">
        <div className="max-w-[1320px] mx-auto px-3 sm:px-6 h-12 sm:h-14 md:h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="/mainmenu.php"
            onClick={(e) => handleNavClick(e, '/mainmenu.php')}
            className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Top Drivers
          </a>

          {/* Zone 2: 5 concise single-line nav links (visible on landscape phones >= 640px) */}
          <nav className="hidden sm:flex items-center gap-3 md:gap-6 text-xs md:text-sm font-medium text-slate-400 overflow-x-auto no-scrollbar">
            {navLinks.map((link) => {
              const active =
                route === link.href ||
                (link.href === '/campaign.php' && route === '/challenges.php');
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'text-white border-amber-400'
                      : 'border-transparent hover:text-slate-100 hover:border-slate-700'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <a
              href="/random_race.php"
              onClick={(e) => handleNavClick(e, '/random_race.php')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                randomRaceUnlocked
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              {!randomRaceUnlocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
              Náhodný závod
            </a>
          </div>
        </div>

        {/* Portrait Mobile Nav Row */}
        <nav className="sm:hidden flex items-center gap-4 px-3 py-2 border-t border-slate-800/70 overflow-x-auto no-scrollbar text-xs font-medium text-slate-400">
          {navLinks.map((link) => {
            const active =
              route === link.href ||
              (link.href === '/campaign.php' && route === '/challenges.php');
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`whitespace-nowrap shrink-0 ${
                  active ? 'text-amber-400 font-semibold' : 'hover:text-white'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </header>

      {/* Compact Workspace Player Telemetry Strip */}
      <div className="border-b border-slate-800/60 bg-[#0E1219]">
        <div className="max-w-[1320px] mx-auto px-3 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-400 tabular-nums overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <span>
              Cash: <strong className="font-mono text-amber-400">${profile.cash.toLocaleString('sk-SK')}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 sm:gap-2">
              <span>
                Lvl <strong className="font-mono text-sky-400">{lvlInfo.level}</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span>
                RQ:{' '}
                <strong className="font-mono text-slate-100">
                  {deckRqSample}/{profile.rqLevel}
                </strong>
              </span>
              {!lvlInfo.isMaxRq && (
                <span className="hidden md:inline-flex items-center gap-1.5">
                  <span className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden inline-block">
                    <span
                      className="block h-full bg-sky-400"
                      style={{ width: `${lvlInfo.progressPct}%` }}
                    />
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {lvlInfo.currentLevelXp}/{lvlInfo.nextLevelXp} XP
                  </span>
                </span>
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Zápasy:{' '}
              <strong className="font-mono text-slate-200">
                {randomRaceUnlocked
                  ? `${profile.matchesPlayed} (Random Race)`
                  : `${profile.matchesPlayed}/10`}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 font-mono text-[11px] shrink-0">
            {authUser && (
              <span className="inline-flex items-center gap-1 text-slate-300">
                <User className="w-3 h-3 text-amber-400" />
                {authUser.username}
              </span>
            )}
            <a
              href="/admin.php"
              onClick={(e) => handleNavClick(e, '/admin.php')}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap ${
                route === '/admin.php' ? 'text-amber-400 font-semibold' : 'text-slate-400'
              }`}
            >
              Admin
            </a>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer whitespace-nowrap"
              title="Odhlásiť sa"
            >
              <LogOut className="w-3 h-3" />
              Odhlásiť
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-7">
        {route === '/mainmenu.php' && <MainMenuPage onNavigate={navigate} />}
        {route === '/garage.php' && <GaragePage />}
        {route === '/shop.php' && <ShopPage />}
        {route === '/campaign.php' && <CampaignPage initialTab="campaign" />}
        {route === '/challenges.php' && <CampaignPage initialTab="challenges" />}
        {route === '/random_race.php' && <RandomRacePage onNavigate={navigate} />}
        {route === '/settings.php' && <SettingsPage onNavigate={navigate} />}
        {route === '/admin.php' && <AdminPage />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/70 bg-[#0E1219]">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>Top Drivers · Taktická kartová automobilová hra</span>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/mainmenu.php" onClick={(e) => handleNavClick(e, '/mainmenu.php')} className="hover:text-slate-300">
              mainmenu.php
            </a>
            <a href="/garage.php" onClick={(e) => handleNavClick(e, '/garage.php')} className="hover:text-slate-300">
              garage.php
            </a>
            <a href="/shop.php" onClick={(e) => handleNavClick(e, '/shop.php')} className="hover:text-slate-300">
              shop.php
            </a>
            <a href="/campaign.php" onClick={(e) => handleNavClick(e, '/campaign.php')} className="hover:text-slate-300">
              campaign.php
            </a>
            <a href="/random_race.php" onClick={(e) => handleNavClick(e, '/random_race.php')} className="hover:text-slate-300">
              random_race.php
            </a>
            <a href="/settings.php" onClick={(e) => handleNavClick(e, '/settings.php')} className="hover:text-slate-300">
              settings.php
            </a>
            <a href="/admin.php" onClick={(e) => handleNavClick(e, '/admin.php')} className="hover:text-slate-300">
              admin.php
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { authUser, authLoading } = useGame();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0C0F14] text-slate-300 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="font-display text-2xl font-bold text-white">Top Drivers</div>
          <div className="text-xs font-mono text-slate-400">Načítavam profil a katalóg...</div>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthGate />;
  }

  return <AppShell />;
};

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
