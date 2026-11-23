const BRAZILIAN_NAMES = [
  'Rafaela',
  'Isabela',
  'Vicente',
  'Bianca',
  'Jonas',
  'Aline',
  'Marina',
  'Henrique',
  'Luan',
  'Sabrina',
  'Joaquim',
  'Enzo',
  'Lia',
  'Bruna',
  'Iara',
  'Danilo',
  'Camila',
  'Mateus',
  'Letícia',
  'Tiago',
];

export const PERSONALITY_TRAITS = [
  { id: 'competition', icon: '🏆', label: 'Competição', color: '#f59e0b', desc: 'Gosta de desafios e pede revanche quando perde.' },
  { id: 'betting', icon: '🎲', label: 'Apostas', color: '#ec4899', desc: 'Aposta alto no Jokenpô e nos duelos do escritório.' },
  { id: 'games', icon: '🎮', label: 'Games', color: '#8b5cf6', desc: 'Prefere fliperama e videogame no lounge.' },
  { id: 'tv', icon: '📺', label: 'Séries e TV', color: '#3b82f6', desc: 'Assiste futebol, novela ou desenho no sofá.' },
  { id: 'gossip', icon: '🗣️', label: 'Fofoca', color: '#14b8a6', desc: 'Puxa assunto sobre commits e colegas na copa.' },
  { id: 'vanity', icon: '💄', label: 'Vaidade', color: '#f43f5e', desc: 'Passa no espelho do banheiro para se arrumar.' },
  { id: 'caffeine', icon: '☕', label: 'Cafeína', color: '#b45309', desc: 'Busca café na copa assim que termina um turno.' },
  { id: 'jokes', icon: '😂', label: 'Piadas', color: '#eab308', desc: 'Solta piadas nas rodas e faz o pessoal rir.' },
  { id: 'sports', icon: '🏓', label: 'Esporte', color: '#10b981', desc: 'Convida colegas para partidas de pingue-pongue.' },
  { id: 'shy', icon: '🙈', label: 'Timidez', color: '#64748b', desc: 'Prefere conversas menores ou assistir aos jogos.' },
  { id: 'frugal', icon: '💰', label: 'Economia', color: '#22c55e', desc: 'Aposta pouco e guarda suas moedinhas.' },
  { id: 'naps', icon: '😴', label: 'Sonecas', color: '#6366f1', desc: 'Tira cochilos mais fácil no sofá quando ocioso.' },
  { id: 'calm', icon: '🧘', label: 'Calma', color: '#06b6d4', desc: 'Mantém a tranquilidade e evita brigas.' },
  { id: 'reading', icon: '📚', label: 'Leitura', color: '#0ea5e9', desc: 'Gosta de livros, docs e dicas técnicas.' },
];

const CATCHPHRASES = [
  'Tamo junto!',
  'Bora codar!',
  'Tá pago!',
  'Café primeiro!',
  'Sem bug hoje!',
  'Foco no deploy!',
  'Confia no processo!',
  'Só mais um refactor!',
  'Bora pro ping-pong!',
  'Testes verdes!',
];

const STORAGE_KEY = 'pixel-office-social-v3';

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getAgentPersonality(agent) {
  const seed = String(agent?.id || agent?.personaName || agent?.title || 'agent');
  const h = hashStr(seed);
  const autoName = agent?.personaName || BRAZILIAN_NAMES[h % BRAZILIAN_NAMES.length];
  const displayName = agent?.customLook?.nickname || autoName;

  const traitCount = 2 + ((h >>> 4) % 2);
  const picked = [];
  const used = new Set();
  for (let i = 0; i < 6 && picked.length < traitCount; i += 1) {
    const idx = ((h + i * 7 + (h >>> (i + 2))) >>> 0) % PERSONALITY_TRAITS.length;
    if (!used.has(idx)) {
      used.add(idx);
      picked.push(PERSONALITY_TRAITS[idx]);
    }
  }

  return {
    displayName,
    autoName,
    traits: picked,
    catchphrase: CATCHPHRASES[(h >>> 8) % CATCHPHRASES.length],
  };
}

function hasTrait(personality, traitId) {
  return personality.traits.some((t) => t.id === traitId);
}

export class SocialEngine {
  constructor() {
    this.profiles = new Map();
    this.circles = [];
    this.floatingCoins = [];
    this.lastWorkState = new Map();
    this.lastToolCount = new Map();
    this.lastSubCount = new Map();
    this.lastTickAt = 0;
    this.lastCircleSpawnAt = 0;
    this.hydrate();
  }

  hydrate() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [id, prof] of Object.entries(parsed)) {
          if (prof && typeof prof === 'object') {
            this.profiles.set(id, prof);
          }
        }
      }
    } catch {
      // Opaque MCP iframe origin blocks localStorage; keep in memory
    }
  }

  persist() {
    try {
      const obj = {};
      let count = 0;
      for (const [id, prof] of this.profiles.entries()) {
        if (count++ > 40) break;
        obj[id] = prof;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  ensureProfile(agent, allAgents = []) {
    let prof = this.profiles.get(agent.id);
    const personality = getAgentPersonality(agent);
    if (!prof) {
      const isSub = Boolean(agent.isSubagent);
      prof = {
        id: agent.id,
        coins: isSub ? 30 : 100,
        wins: 0,
        losses: 0,
        rivalScores: {},
        ledger: [
          {
            ts: Date.now(),
            delta: isSub ? 30 : 100,
            reason: 'Chegou ao escritório',
          },
        ],
      };
      this.profiles.set(agent.id, prof);
    }

    // Compute deterministic friends & rivals from current office peers
    const peers = allAgents
      .filter((a) => a.id !== agent.id && a.state !== 'offline')
      .map((a) => ({ id: a.id, name: getAgentPersonality(a).displayName }));

    const h = hashStr(agent.id);
    const friends = [];
    const rivals = [];
    peers.forEach((peer, idx) => {
      const rel = (h + hashStr(peer.id) + idx) % 5;
      if (rel === 0 || rel === 1) friends.push(peer);
      else if (rel === 2) rivals.push(peer);
    });

    return {
      ...prof,
      personality,
      friends: friends.slice(0, 3),
      rivals: rivals.slice(0, 2),
    };
  }

  addCoins(agentId, delta, reason, pos = null) {
    const prof = this.profiles.get(agentId);
    if (!prof || !delta) return;
    prof.coins = Math.max(0, prof.coins + delta);
    prof.ledger.unshift({ ts: Date.now(), delta, reason });
    if (prof.ledger.length > 24) prof.ledger.length = 24;
    this.floatingCoins.push({
      agentId,
      x: pos?.x || 0,
      y: pos?.y || 0,
      text: `${delta > 0 ? '+' : '−'}🪙${Math.abs(delta)}`,
      color: delta > 0 ? '#facc15' : '#f87171',
      bornAt: Date.now(),
    });
    if (this.floatingCoins.length > 24) this.floatingCoins.shift();
    this.persist();
  }

  setBubble(agentId, text, kind = 'social', durationMs = 3400) {
    const prof = this.profiles.get(agentId);
    if (!prof) return;
    prof.bubble = { text, kind, expiresAt: Date.now() + durationMs };
  }

  getAgentBubble(agentId, now = Date.now()) {
    const prof = this.profiles.get(agentId);
    if (prof?.bubble && prof.bubble.expiresAt > now) {
      return prof.bubble;
    }
    return null;
  }

  getFloatingCoins(now = Date.now()) {
    this.floatingCoins = this.floatingCoins.filter((c) => now - c.bornAt < 1800);
    return this.floatingCoins;
  }

  getActiveCircles() {
    return this.circles;
  }

  getTargetForAgent(agentId) {
    for (const circle of this.circles) {
      const slot = circle.slots.find((s) => s.agentId === agentId);
      if (slot) {
        return {
          roomId: circle.roomId,
          x: slot.x,
          y: slot.y,
          facingDir: slot.dir || 1,
          activity: circle.label,
          circleKind: circle.kind,
          showMirror: circle.kind === 'mirror',
        };
      }
    }
    return null;
  }

  getAgentSocialProfile(agent, allAgents = []) {
    const prof = this.ensureProfile(agent, allAgents);
    const circle = this.circles.find((c) =>
      c.slots.some((s) => s.agentId === agent.id)
    );
    return {
      ...prof,
      currentActivity: circle ? circle.label : null,
    };
  }

  update(agents, commonAnchors, now, options = {}) {
    const socialEnabled = options.socialEnabled !== false;
    const onSocialFeed = options.onSocialFeed;
    const onSound = options.onSound;

    // 1. Reward real work progress
    for (const agent of agents) {
      this.ensureProfile(agent, agents);
      const prevState = this.lastWorkState.get(agent.id);
      if (prevState && prevState !== agent.state) {
        if (agent.state === 'done') {
          this.addCoins(agent.id, 5, 'Pedido atendido');
          onSound?.('coin');
        }
        const wasWorking = ['coding', 'reading', 'terminal', 'thinking', 'waiting', 'dreaming'].includes(
          agent.state
        );
        if (wasWorking) {
          const inCircle = this.circles.some((c) =>
            c.slots.some((s) => s.agentId === agent.id)
          );
          if (inCircle) {
            this.removeAgentFromCircles(agent.id);
            this.setBubble(agent.id, 'Opa, me chamaram! 🏃', 'work', 2400);
          }
        }
      }
      this.lastWorkState.set(agent.id, agent.state);

      const prevTools = this.lastToolCount.get(agent.id) ?? agent.toolCount ?? 0;
      if ((agent.toolCount || 0) - prevTools >= 3) {
        this.addCoins(agent.id, 10, 'Tarefa concluída');
        this.lastToolCount.set(agent.id, agent.toolCount);
      } else if (!this.lastToolCount.has(agent.id)) {
        this.lastToolCount.set(agent.id, agent.toolCount || 0);
      }

      const subLen = agent.subagentDetails?.length || agent.subagents?.length || 0;
      const prevSubs = this.lastSubCount.get(agent.id) ?? subLen;
      if (subLen > prevSubs) {
        this.addCoins(agent.id, 15, 'Subagente entregou o resultado');
      }
      this.lastSubCount.set(agent.id, subLen);
    }

    if (!socialEnabled || !commonAnchors) {
      this.circles = [];
      return;
    }

    if (now - this.lastTickAt < 950) return;
    this.lastTickAt = now;

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    // 2. Clean expired or invalid circles
    this.circles = this.circles.filter((circle) => {
      if (now >= circle.expiresAt) {
        this.finishCircle(circle, agentMap, onSocialFeed, onSound);
        return false;
      }
      circle.slots = circle.slots.filter((s) => {
        const a = agentMap.get(s.agentId);
        return a && a.state === 'idle' && !a.sleeping;
      });
      return circle.slots.length >= (circle.minMembers || 1);
    });

    // 3. Tick active circles (banter, scores, Jokenpo steps)
    for (const circle of this.circles) {
      this.tickCircle(circle, agentMap, now, onSocialFeed, onSound);
    }

    // 4. Spawn new social circles among free idle agents
    if (now - this.lastCircleSpawnAt < 5000) return;
    this.lastCircleSpawnAt = now;

    const busyInCircle = new Set();
    for (const c of this.circles) {
      for (const s of c.slots) busyInCircle.add(s.agentId);
    }

    const freeIdle = agents.filter(
      (a) => a.state === 'idle' && !a.sleeping && !busyInCircle.has(a.id)
    );
    if (freeIdle.length === 0) return;

    this.tryFormCircle(freeIdle, agents, commonAnchors, now, onSocialFeed);
  }

  removeAgentFromCircles(agentId) {
    for (const circle of this.circles) {
      circle.slots = circle.slots.filter((s) => s.agentId !== agentId);
    }
    this.circles = this.circles.filter((c) => c.slots.length >= (c.minMembers || 1));
  }

  tryFormCircle(freeIdle, allAgents, anchors, now, onSocialFeed) {
    const activeKinds = new Set(this.circles.map((c) => c.kind));
    const pick = freeIdle[Math.floor(Math.random() * freeIdle.length)];
    const p1 = getAgentPersonality(pick);
    const others = freeIdle.filter((a) => a.id !== pick.id);

    // Solo or pair mirror in Bathroom if Vanity trait
    if (
      !activeKinds.has('mirror') &&
      anchors.mirror &&
      (hasTrait(p1, 'vanity') || (others.length === 0 && Math.random() < 0.35))
    ) {
      const pair = others[0];
      const slots = [
        { agentId: pick.id, x: anchors.mirror.x - 14, y: anchors.mirror.y, dir: 1 },
      ];
      if (pair) {
        slots.push({ agentId: pair.id, x: anchors.mirror.x + 14, y: anchors.mirror.y, dir: -1 });
      }
      const names = slots.map((s) => getAgentPersonality(allAgents.find((a) => a.id === s.agentId)).displayName);
      this.circles.push({
        id: `c-${now}-mirror`,
        kind: 'mirror',
        roomId: anchors.mirror.roomId,
        label: `No espelho do banheiro${pair ? ` com ${names[1]}` : ''}`,
        minMembers: 1,
        startedAt: now,
        nextStepAt: now + 2200,
        expiresAt: now + 11000,
        step: 0,
        slots,
      });
      this.setBubble(pick.id, pair ? 'Empresta o pente?' : 'Visual em dia! ✨', 'social', 2600);
      return;
    }

    if (others.length === 0) {
      // Solo TV or coffee break
      if (!activeKinds.has('tv') && anchors.tv) {
        const show = ['futebol', 'novela', 'desenho'][Math.floor(Math.random() * 3)];
        this.circles.push({
          id: `c-${now}-tv`,
          kind: 'tv',
          show,
          roomId: anchors.tv.roomId,
          label: `Vendo ${show} na TV`,
          minMembers: 1,
          startedAt: now,
          nextStepAt: now + 3000,
          expiresAt: now + 14000,
          step: 0,
          slots: [{ agentId: pick.id, x: anchors.tv.x - 14, y: anchors.tv.y, dir: 1 }],
        });
      }
      return;
    }

    const partner = others[0];
    const third = others[1];
    const p2 = getAgentPersonality(partner);

    // Choose activity weighted by traits
    const candidates = [];
    if (!activeKinds.has('pingpong') && anchors.pingpong) {
      candidates.push(hasTrait(p1, 'sports') || hasTrait(p2, 'sports') ? 'pingpong' : 'pingpong');
    }
    if (!activeKinds.has('jokenpo') && anchors.jokenpo) candidates.push('jokenpo');
    if (!activeKinds.has('copa') && anchors.copa) candidates.push('copa');
    if (!activeKinds.has('arcade') && anchors.arcade) candidates.push('arcade');
    if (!activeKinds.has('tv') && anchors.tv) candidates.push('tv');
    if (!activeKinds.has('chat') && anchors.chat) candidates.push('chat');

    if (candidates.length === 0) return;

    let chosen = candidates[Math.floor(Math.random() * candidates.length)];
    if ((hasTrait(p1, 'sports') || hasTrait(p2, 'sports')) && candidates.includes('pingpong')) {
      chosen = 'pingpong';
    } else if ((hasTrait(p1, 'betting') || hasTrait(p1, 'competition')) && candidates.includes('jokenpo')) {
      chosen = 'jokenpo';
    } else if ((hasTrait(p1, 'games') || hasTrait(p2, 'games')) && candidates.includes('arcade')) {
      chosen = 'arcade';
    } else if ((hasTrait(p1, 'caffeine') || hasTrait(p1, 'gossip')) && candidates.includes('copa')) {
      chosen = 'copa';
    }

    if (chosen === 'pingpong') {
      const slots = [
        { agentId: pick.id, x: anchors.pingpong.x - 30, y: anchors.pingpong.y, dir: 1 },
        { agentId: partner.id, x: anchors.pingpong.x + 30, y: anchors.pingpong.y, dir: -1 },
      ];
      if (third) {
        slots.push({ agentId: third.id, x: anchors.pingpong.x, y: anchors.pingpong.y - 22, dir: 1 });
      }
      this.circles.push({
        id: `c-${now}-pp`,
        kind: 'pingpong',
        roomId: anchors.pingpong.roomId,
        label: `Jogando pingue-pongue (${p1.displayName} × ${p2.displayName})`,
        minMembers: 2,
        scoreA: 0,
        scoreB: 0,
        startedAt: now,
        nextStepAt: now + 2200,
        expiresAt: now + 16000,
        slots,
      });
      this.setBubble(pick.id, 'Saca lá! 🏓', 'social', 2200);
      return;
    }

    if (chosen === 'jokenpo') {
      const prof1 = this.profiles.get(pick.id);
      const prof2 = this.profiles.get(partner.id);
      const maxBet = Math.min(prof1?.coins || 10, prof2?.coins || 10);
      const rawBet = hasTrait(p1, 'betting') || hasTrait(p2, 'betting') ? 20 : hasTrait(p1, 'frugal') ? 5 : 10;
      const bet = Math.max(5, Math.min(rawBet, maxBet));
      const slots = [
        { agentId: pick.id, x: anchors.jokenpo.x - 20, y: anchors.jokenpo.y, dir: 1 },
        { agentId: partner.id, x: anchors.jokenpo.x + 20, y: anchors.jokenpo.y, dir: -1 },
      ];
      this.circles.push({
        id: `c-${now}-jkp`,
        kind: 'jokenpo',
        roomId: anchors.jokenpo.roomId,
        label: `Jokenpô valendo 🪙${bet} com ${p2.displayName}`,
        bet,
        step: 0,
        minMembers: 2,
        startedAt: now,
        nextStepAt: now + 1600,
        expiresAt: now + 11000,
        slots,
      });
      this.setBubble(pick.id, `Valendo 🪙${bet}?`, 'social', 2000);
      return;
    }

    if (chosen === 'arcade') {
      const slots = [
        { agentId: pick.id, x: anchors.arcade.x - 16, y: anchors.arcade.y, dir: 1 },
        { agentId: partner.id, x: anchors.arcade.x + 16, y: anchors.arcade.y, dir: -1 },
      ];
      this.circles.push({
        id: `c-${now}-arc`,
        kind: 'arcade',
        roomId: anchors.arcade.roomId,
        label: `Duelando no Fliperama com ${p2.displayName}`,
        minMembers: 2,
        startedAt: now,
        nextStepAt: now + 2600,
        expiresAt: now + 14000,
        step: 0,
        slots,
      });
      this.setBubble(pick.id, 'Bora um duelo! 👾', 'social', 2400);
      return;
    }

    if (chosen === 'copa') {
      const members = [pick, partner, ...(third ? [third] : [])];
      const offsets = [-22, 22, 0];
      const slots = members.map((m, i) => ({
        agentId: m.id,
        x: anchors.copa.x + offsets[i],
        y: anchors.copa.y + (i === 2 ? -14 : 6),
        dir: i === 1 ? -1 : 1,
      }));
      this.circles.push({
        id: `c-${now}-copa`,
        kind: 'copa',
        roomId: anchors.copa.roomId,
        label: `Papo na Copa (${members.map((m) => getAgentPersonality(m).displayName).join(', ')})`,
        minMembers: 2,
        startedAt: now,
        nextStepAt: now + 2200,
        expiresAt: now + 14000,
        step: 0,
        slots,
      });
      const colleague = allAgents.find((a) => a.id !== pick.id && a.id !== partner.id);
      const colName = colleague ? getAgentPersonality(colleague).displayName : p2.displayName;
      this.setBubble(pick.id, `Viram o commit de ${colName}? 👀`, 'social', 2800);
      onSocialFeed?.({
        ts: now,
        source: 'social',
        agentId: pick.id,
        label: 'Copa',
        state: 'idle',
        message: `☕ ${p1.displayName} puxou papo na copa com ${p2.displayName}`,
      });
      return;
    }

    if (chosen === 'tv') {
      const show = ['futebol', 'novela', 'desenho'][Math.floor(Math.random() * 3)];
      const members = [pick, partner, ...(third ? [third] : [])];
      const slots = members.map((m, i) => ({
        agentId: m.id,
        x: anchors.tv.x - 20 + i * 20,
        y: anchors.tv.y,
        dir: 1,
      }));
      this.circles.push({
        id: `c-${now}-tv`,
        kind: 'tv',
        show,
        roomId: anchors.tv.roomId,
        label: `Vendo ${show} na TV com ${p2.displayName}`,
        minMembers: 1,
        startedAt: now,
        nextStepAt: now + 2400,
        expiresAt: now + 14000,
        step: 0,
        slots,
      });
      return;
    }

    // chat
    this.circles.push({
      id: `c-${now}-chat`,
      kind: 'chat',
      roomId: anchors.chat.roomId,
      label: `Conversando com ${p2.displayName}`,
      minMembers: 2,
      startedAt: now,
      nextStepAt: now + 2200,
      expiresAt: now + 11000,
      step: 0,
      slots: [
        { agentId: pick.id, x: anchors.chat.x - 16, y: anchors.chat.y, dir: 1 },
        { agentId: partner.id, x: anchors.chat.x + 16, y: anchors.chat.y, dir: -1 },
      ],
    });
    this.setBubble(pick.id, p1.catchphrase, 'social', 2400);
  }

  tickCircle(circle, agentMap, now, onSocialFeed, onSound) {
    if (now < circle.nextStepAt) return;
    circle.nextStepAt = now + 2300;
    circle.step = (circle.step || 0) + 1;

    const s0 = circle.slots[0];
    const s1 = circle.slots[1];
    const a0 = s0 ? agentMap.get(s0.agentId) : null;
    const a1 = s1 ? agentMap.get(s1.agentId) : null;
    if (!a0) return;
    const n0 = getAgentPersonality(a0).displayName;
    const n1 = a1 ? getAgentPersonality(a1).displayName : '';

    if (circle.kind === 'pingpong' && a1) {
      if (Math.random() < 0.55) circle.scoreA += 1;
      else circle.scoreB += 1;
      this.setBubble(a0.id, `${circle.scoreA} × ${circle.scoreB} 🏓`, 'social', 2100);
      onSound?.('pingpong');
      if (circle.scoreA >= 5 || circle.scoreB >= 5) {
        circle.expiresAt = now;
      }
      return;
    }

    if (circle.kind === 'jokenpo' && a1) {
      if (circle.step === 1) {
        this.setBubble(a0.id, 'Jo… ken…', 'social', 1600);
        this.setBubble(a1.id, '…pô!', 'social', 1600);
      } else if (circle.step === 2) {
        const hands = ['✊ Pedra', '✋ Papel', '✌️ Tesoura'];
        const i0 = Math.floor(Math.random() * 3);
        let i1 = Math.floor(Math.random() * 3);
        if (i0 === i1) i1 = (i1 + 1) % 3; // avoid infinite tie
        this.setBubble(a0.id, hands[i0], 'social', 2000);
        this.setBubble(a1.id, hands[i1], 'social', 2000);
        const a0Wins = (i0 === 0 && i1 === 2) || (i0 === 1 && i1 === 0) || (i0 === 2 && i1 === 1);
        circle.winnerId = a0Wins ? a0.id : a1.id;
        circle.loserId = a0Wins ? a1.id : a0.id;
      } else if (circle.step === 3 && circle.winnerId && !circle.settled) {
        circle.settled = true;
        const winAgent = agentMap.get(circle.winnerId);
        const loseAgent = agentMap.get(circle.loserId);
        const winName = winAgent ? getAgentPersonality(winAgent).displayName : '';
        const loseName = loseAgent ? getAgentPersonality(loseAgent).displayName : '';
        this.setBubble(circle.winnerId, 'Ganhei! 🪙', 'happy', 2400);
        this.setBubble(circle.loserId, 'Revanche!', 'social', 2400);
        this.addCoins(circle.winnerId, circle.bet, `Jokenpô vs ${loseName}`, circle.slots[0]);
        this.addCoins(circle.loserId, -circle.bet, `Jokenpô vs ${winName}`, circle.slots[1]);

        const wp = this.profiles.get(circle.winnerId);
        const lp = this.profiles.get(circle.loserId);
        if (wp) {
          wp.wins += 1;
          wp.rivalScores[loseName] = wp.rivalScores[loseName] || { wins: 0, losses: 0 };
          wp.rivalScores[loseName].wins += 1;
        }
        if (lp) {
          lp.losses += 1;
          lp.rivalScores[winName] = lp.rivalScores[winName] || { wins: 0, losses: 0 };
          lp.rivalScores[winName].losses += 1;
        }
        this.persist();
        onSound?.('coin');
        onSocialFeed?.({
          ts: now,
          source: 'social',
          agentId: circle.winnerId,
          label: 'Jokenpô',
          state: 'done',
          message: `✊ ${winName} venceu ${loseName} no jokenpô (+🪙${circle.bet})`,
        });
      }
      return;
    }

    if (circle.kind === 'tv') {
      const lines =
        circle.show === 'futebol'
          ? ['GOL! ⚽', 'Passa a bola!', 'Que defesa!']
          : circle.show === 'novela'
            ? ['Não acredito! 😱', 'Que cena!', 'Eita! ❤️']
            : ['Hahaha 😂', 'Olha isso!', 'Clássico!'];
      const chosen = circle.slots[circle.step % circle.slots.length];
      this.setBubble(chosen.agentId, lines[circle.step % lines.length], 'social', 2200);
      return;
    }

    if (circle.kind === 'arcade' && a1) {
      const lines = ['Que lag é esse?!', 'Combo x8! 🔥', 'Quase bati o recorde!', 'Toma essa! 👾'];
      const target = circle.step % 2 === 0 ? a0.id : a1.id;
      this.setBubble(target, lines[circle.step % lines.length], 'social', 2200);
      return;
    }

    if (circle.kind === 'copa' && a1) {
      const lines = ['Vai dar certo! ☕', 'Deploy na sexta? 😈', 'Hahaha 😂', 'Mais um café!'];
      const target = circle.slots[circle.step % circle.slots.length].agentId;
      this.setBubble(target, lines[circle.step % lines.length], 'social', 2200);
      return;
    }

    if (circle.kind === 'mirror') {
      this.setBubble(a0.id, 'Tá arrasando! ✨', 'social', 2200);
      return;
    }

    if (circle.kind === 'chat' && a1) {
      const p1 = getAgentPersonality(a1);
      this.setBubble(a1.id, p1.catchphrase, 'social', 2200);
    }
  }

  finishCircle(circle, agentMap, onSocialFeed, onSound) {
    if (circle.kind === 'pingpong' && circle.slots.length >= 2) {
      const a0 = agentMap.get(circle.slots[0].agentId);
      const a1 = agentMap.get(circle.slots[1].agentId);
      if (a0 && a1) {
        const winner = circle.scoreA >= circle.scoreB ? a0 : a1;
        const loser = winner.id === a0.id ? a1 : a0;
        const wn = getAgentPersonality(winner).displayName;
        const ln = getAgentPersonality(loser).displayName;
        this.addCoins(winner.id, 10, `Ping-pong vs ${ln}`, circle.slots[0]);
        const wp = this.profiles.get(winner.id);
        const lp = this.profiles.get(loser.id);
        if (wp) wp.wins += 1;
        if (lp) lp.losses += 1;
        this.persist();
        onSound?.('coin');
        onSocialFeed?.({
          ts: Date.now(),
          source: 'social',
          agentId: winner.id,
          label: 'Ping-pong',
          state: 'done',
          message: `🏓 ${wn} venceu ${ln} (${circle.scoreA}×${circle.scoreB}) +🪙10`,
        });
      }
    }
  }
}
