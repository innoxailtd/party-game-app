"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Dice5,
  History,
  Home,
  Lock,
  PlayCircle,
  Trophy,
  User2,
} from "lucide-react";

const games = [
  {
    title: "害人在心口難開",
    description: "禁語猜謎",
    image:
      "https://img.icons8.com/?size=512&id=kDHvJoFHZNdj&format=png", // 3D 禁語標誌
    href: "/games/taboo",
    status: "live" as const,
    tag: "熱門推薦",
  },
  {
    title: "誰是臥底",
    description: "找出不同者",
    image:
      "https://img.icons8.com/?size=512&id=5rH7uhScPEe1&format=png", // 3D 偵探
    href: "/games/undercover",
    status: "soon" as const,
    tag: "Coming Soon",
  },
  {
    title: "真心話大冒險",
    description: "笑聲與尖叫",
    image:
      "https://img.icons8.com/?size=512&id=KDfI4ATTkHLt&format=png", // 3D 派對禮物盒
    href: "/games/truth-or-dare",
    status: "soon" as const,
    tag: "Coming Soon",
  },
];

const navItems = [
  { label: "Home", icon: Home, href: "/" },
  { label: "History", icon: History, href: "#history" },
  { label: "Profile", icon: User2, href: "#profile" },
];

const quickActions = [
  {
    label: "隨機開始",
    icon: Dice5,
    bg: "bg-gradient-to-br from-orange-400 to-pink-500",
    action: "play",
  },
  {
    label: "排行榜",
    icon: Trophy,
    bg: "bg-gradient-to-br from-blue-400 to-cyan-500",
    action: "rank",
  },
];

export function GameHub() {
  const quickPlayTarget =
    games.find((game) => game.status === "live")?.href ?? "/";

  return (
    <div className="relative min-h-screen bg-slate-50 pb-32 text-slate-900">
      {/* 1. 寬版 Hero Banner */}
      <section className="relative flex h-80 w-full items-center overflow-hidden rounded-b-[3rem] bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 shadow-2xl shadow-fuchsia-200 sm:px-10">
        {/* 背景裝飾 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-indigo-200 blur-2xl" />
        </div>

        <div className="relative z-10 flex w-full max-w-6xl mx-auto items-center justify-between">
          <div className="max-w-lg space-y-2">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              Party Time 🎉
            </span>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-6xl drop-shadow-md">
              派對遊戲開始！
            </h1>
            <p className="text-lg font-medium text-white/80">
              探索最有趣的聚會遊戲，讓尷尬變成歡笑。
            </p>
          </div>

          {/* 3D Hero Image with Float Animation */}
          <div className="hidden animate-float sm:block">
            <Image
              src="/banana.jpg"
              alt="Party Game 3D Banana Illustration"
              width={320}
              height={320}
              className="drop-shadow-2xl transition-transform duration-500 hover:scale-105"
              priority
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 -mt-10 relative z-20 space-y-10">
        {/* 2. 快速功能圖標列 */}
        <div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isPlay = action.action === "play";
            return isPlay ? (
              <Link
                key={action.label}
                href={quickPlayTarget}
                className={`group relative flex h-24 min-w-[160px] flex-1 items-center gap-4 rounded-3xl ${action.bg} p-5 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{action.label}</p>
                  <p className="text-xs font-medium text-white/80">Quick Play</p>
                </div>
              </Link>
            ) : (
              <div
                key={action.label}
                className={`group relative flex h-24 min-w-[160px] flex-1 cursor-pointer items-center gap-4 rounded-3xl ${action.bg} p-5 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{action.label}</p>
                  <p className="text-xs font-medium text-white/80">Leaderboard</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. 遊戲列表區域 (Vertical List) */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">熱門遊戲 🔥</h2>
            <span className="text-sm font-semibold text-slate-400">
              {games.length} Games
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {games.map((game) => {
              const isLive = game.status === "live";
              return (
                <Link
                  key={game.title}
                  href={isLive ? game.href : "#"}
                  onClick={(e) => !isLive && e.preventDefault()}
                  className={`group relative flex items-center gap-5 rounded-[2rem] border border-slate-100 bg-white p-4 pr-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ${
                    isLive
                      ? "hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]"
                      : "cursor-not-allowed opacity-60 grayscale-[0.4]"
                  }`}
                >
                  {/* Left 3D Icon */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-slate-50">
                    <Image
                      src={game.image}
                      alt={game.title}
                      width={64}
                      height={64}
                      className="object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  {/* Middle Info */}
                  <div className="flex-1 py-1">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-400 line-clamp-1">
                      {game.description}
                    </p>
                    {!isLive && (
                      <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        COMING SOON
                      </span>
                    )}
                  </div>

                  {/* Right Button */}
                  <div className="shrink-0">
                    {isLive ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-200 transition-transform group-hover:scale-110 group-active:scale-95">
                        <PlayCircle className="h-6 w-6 fill-current" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* 4. Bottom Navigation */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-6">
        <div className="pointer-events-auto flex w-full max-w-[320px] items-center justify-around rounded-[2rem] bg-white/90 px-2 py-2 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ring-1 ring-white/50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/";
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all duration-300`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                    isActive
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200"
                      : "text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "fill-current" : ""}`} />
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
