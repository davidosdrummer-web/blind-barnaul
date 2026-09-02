import { useEffect, useState } from "react";
import { Club, User, Tournament, Season, Template, Achievement } from "./db";
import {
  subscribeClub, subscribeUsers, subscribeTournaments, subscribeSeasons,
  subscribeTemplates, subscribeAchievements, subscribeScreens,
} from "./firebaseDb";

export function useFirebaseData() {
  const [club, setClub] = useState<Club | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [tournaments, setTournaments] = useState<Record<string, Tournament>>({});
  const [seasons, setSeasons] = useState<Record<string, Season>>({});
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [achievements, setAchievements] = useState<Record<string, Achievement>>({});
  const [screens, setScreens] = useState<Record<string, { type: string; tournamentId: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loaded = 0;
    const total = 7;
    const check = () => { 
      loaded++; 
      if (loaded >= total) setLoading(false); 
    };
    
    const unsubs: (() => void)[] = [];
    unsubs.push(subscribeClub((c) => { setClub(c); check(); }));
    unsubs.push(subscribeUsers((u) => { setUsers(u); check(); }));
    unsubs.push(subscribeTournaments((t) => { setTournaments(t); check(); }));
    unsubs.push(subscribeSeasons((s) => { setSeasons(s); check(); }));
    unsubs.push(subscribeTemplates((t) => { setTemplates(t); check(); }));
    unsubs.push(subscribeAchievements((a) => { setAchievements(a); check(); }));
    unsubs.push(subscribeScreens((s) => { setScreens(s); check(); }));
    
    return () => unsubs.forEach(fn => fn());
  }, []);

  return { club, users, tournaments, seasons, templates, achievements, screens, loading };
}