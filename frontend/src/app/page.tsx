"use client";

import { useState, useEffect } from "react";
import { BackgroundVideo } from "@/components/home/BackgroundVideo";
import { Hero } from "@/components/home/Hero";
import { MorphingSpinner } from "@/components/ui/MorphingSpinner";
import { Preloader } from "@/components/ui/Preloader";
import { ResultsAccordion } from "@/components/home/ResultsAccordion";
import { analyzePrompt, AIAnalysisResult } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";

type AppState = "idle" | "loading" | "error" | "results";

let isHydrated = false;

export default function Home() {
  const [appState, setAppState] = useState<AppState>(() => {
    if (typeof window !== "undefined" && isHydrated && window.history.state?.results) return "results";
    return "idle";
  });
  
  const [results, setResults] = useState<AIAnalysisResult | null>(() => {
    if (typeof window !== "undefined" && isHydrated && window.history.state?.results) return window.history.state.results;
    return null;
  });
  
  const [lastRawQuery, setLastRawQuery] = useState(() => {
    if (typeof window !== "undefined" && isHydrated && window.history.state?.rawQuery) return window.history.state.rawQuery;
    return "";
  });
  
  const [isError, setIsError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    isHydrated = true;
    setMounted(true);
    
    // Restore from history on back navigation
    const handlePopState = (event: PopStateEvent) => {
      // If we've navigated back to the root without a query, we must be at the landing page.
      if (!window.location.search) {
        setAppState("idle");
        setResults(null);
        sessionStorage.removeItem("gradewise_search_results");
        sessionStorage.removeItem("gradewise_last_raw_query");
      } else if (event.state && event.state.results) {
        setResults(event.state.results);
        setLastRawQuery(event.state.rawQuery || "");
        setAppState("results");
        sessionStorage.setItem("gradewise_search_results", JSON.stringify(event.state.results));
        sessionStorage.setItem("gradewise_last_raw_query", event.state.rawQuery || "");
      } else {
        // Fallback for missing state but query exists
        setAppState("idle");
        setResults(null);
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Initial load restoration (e.g. from refresh or returning from /compare)
    const saved = sessionStorage.getItem("gradewise_search_results");
    const savedQuery = sessionStorage.getItem("gradewise_last_raw_query");
    
    if (window.location.search && window.history.state && window.history.state.results) {
      // Hydrate from history if Next.js just popped us back
      setResults(window.history.state.results);
      setLastRawQuery(window.history.state.rawQuery || "");
      setAppState("results");
    } else if (window.location.search && saved) {
      try {
        const parsed = JSON.parse(saved);
        setResults(parsed);
        setAppState("results");
        if (savedQuery) setLastRawQuery(savedQuery);
        
        // Push this restored state into history so the stack is correct
        window.history.replaceState({ results: parsed, rawQuery: savedQuery }, "");
      } catch (e) {}
    } else {
       // Mark the initial idle state in history and clear any leftover session data
       window.history.replaceState({ results: null, rawQuery: "" }, "", "/");
       sessionStorage.removeItem("gradewise_search_results");
       sessionStorage.removeItem("gradewise_last_raw_query");
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSearch = async (prompt: string, isRefinement = false) => {
    const lower = prompt.toLowerCase();
    if (lower.includes("capital") || lower.includes("weather") || lower.includes("recipe") || lower.includes("football") || lower.includes("who is")) {
      setAppState("error");
      setIsError(true);
      return;
    }

    setAppState("loading");
    setIsError(false);

    try {
      // Determine what string to actually send to the backend
      let stringToSend = prompt;
      
      if (isRefinement && results) {
         const prevRecs = results.recommendations.map(r => r.grade).join(", ");
         stringToSend = `Original Request Context: "${lastRawQuery}" | Previous Grades Recommended: ${prevRecs} | User's New Refinement: "${prompt}" | Instruction: Contextualise this refinement based on the original request. If the user is narrowing down, heavily bias towards selecting from the previous grades unless the refinement strictly requires a new one.`;
      }

      const data = await analyzePrompt(stringToSend);
      sessionStorage.setItem("gradewise_search_results", JSON.stringify(data));
      sessionStorage.setItem("gradewise_last_raw_query", prompt);
      
      // Push the new search state into browser history so 'back' button works!
      const queryParam = encodeURIComponent(prompt.substring(0, 50));
      window.history.pushState({ results: data, rawQuery: prompt }, "", `/?q=${queryParam}`);
      
      setLastRawQuery(prompt);
      setResults(data);
      // Wait exactly 1.0 second on the black screen
      setTimeout(() => {
        setAppState("results");
      }, 1000); 
    } catch (error) {
      setAppState("error");
      setIsError(true);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-transparent">
      <Preloader />
      
      {/* Background stays active as a static canvas, but freezes frame the millisecond a search starts */}
      <BackgroundVideo isLocked={appState === "loading"} />

      {/* Main UI Layer */}
      <div className="relative z-10 w-full">
        
        <AnimatePresence mode="wait">
          {mounted && appState === "idle" && (
            <motion.div 
              key="hero"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="w-full min-h-screen"
            >
              <Hero onSearch={handleSearch} />
            </motion.div>
          )}

          {appState === "results" && results && (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              className="w-full min-h-screen flex flex-col items-center justify-start pt-16 pb-32 bg-black/40 border-t border-white/5"
            >
              <ResultsAccordion 
                data={results} 
                onRefine={(query) => handleSearch(query, true)} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {appState === "error" && (
          <div className="w-full min-h-screen flex flex-col items-center justify-center pt-20 px-4 bg-black/60 backdrop-blur-md">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[#C62828] font-monument uppercase tracking-widest mb-4">Error: Out of Context</p>
              <button 
                onClick={() => setAppState("idle")}
                className="bg-[#0B1222] border border-[#334155] text-[#C7CDD4] font-suisse px-6 py-2 rounded-lg hover:border-[#FF851B] hover:text-[#FF851B] transition-colors"
              >
                Reset Terminal
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Loading Overlay - Solid Black */}
      <AnimatePresence>
        {appState === "loading" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
          >
            <MorphingSpinner size="lg" />
            <p className="mt-8 text-lg font-suisse text-white tracking-[0.2em] uppercase">
              finding the best choice
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
