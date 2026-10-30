import { describe, it, expect } from "vitest";
import { calcularVdot, pacesDoVdot, cargaCorrida, serieForma, faixaForma, aderenciaPace, totaisEstrutura, resumoEstrutura, estruturaPadrao } from "./corrida-vdot";
import { avisosProgressao } from "./corrida-progressao";

describe("VDOT Daniels", () => {
  it("5 km em 20:00 dá VDOT ~49,8", () => {
    expect(calcularVdot(5, 1200)).toBeGreaterThan(49.3);
    expect(calcularVdot(5, 1200)).toBeLessThan(50.3);
  });
  it("VDOT 50: Limiar ~4:15/km e Intervalado ~3:55/km", () => {
    const p = pacesDoVdot(50);
    expect(Math.abs(p.T - 255)).toBeLessThanOrEqual(3);
    expect(Math.abs(p.I - 235)).toBeLessThanOrEqual(3);
    expect(p.E.min).toBeLessThan(p.E.max);
    expect(p.R).toBeLessThan(p.I);
  });
});

describe("carga e forma", () => {
  it("1 hora no pace Limiar vale 100 pontos", () => {
    expect(cargaCorrida(12, 3600, 300)).toBeCloseTo(100, 5);
  });
  it("sem pace cadastrado, 50 pontos por hora", () => {
    expect(cargaCorrida(10, 5400, null)).toBeCloseTo(75, 5);
  });
  it("CTL/ATL seguem 1/42 e 1/7", () => {
    const s = serieForma({ "2026-10-01": 100 }, "2026-10-01", "2026-10-01");
    expect(s[0].ctl).toBeCloseTo(100 / 42, 5);
    expect(s[0].atl).toBeCloseTo(100 / 7, 5);
    expect(s[0].tsb).toBeCloseTo(100 / 42 - 100 / 7, 5);
  });
  it("faixas de forma", () => {
    expect(faixaForma(26).nome).toBe("Destreinando");
    expect(faixaForma(10).nome).toBe("Pico de forma");
    expect(faixaForma(0).nome).toBe("Manutenção");
    expect(faixaForma(-20).nome).toBe("Construindo condicionamento");
    expect(faixaForma(-30).nome).toBe("Fadiga alta");
    expect(faixaForma(-41).nome).toBe("Excesso de carga");
  });
});

describe("aderência (tolerância 5%)", () => {
  it("classifica pace feito x alvo", () => {
    expect(aderenciaPace(300, 300)).toBe("dentro");
    expect(aderenciaPace(314, 300)).toBe("dentro");
    expect(aderenciaPace(320, 300)).toBe("abaixo");
    expect(aderenciaPace(280, 300)).toBe("acima");
  });
});

describe("estrutura de corrida", () => {
  it("6x800 m com 5 recuperações por tempo", () => {
    const p = pacesDoVdot(50);
    const t = totaisEstrutura(
      { aquecimento: null, desaquecimento: null, principal: { medida: "distancia", valor: 800, zona: "I", repeticoes: 6 }, recuperacao: { medida: "tempo", valor: 120, zona: "E" } },
      p,
    );
    expect(t.seg).toBeCloseTo(4.8 * p.I + 5 * 120, 0);
  });
});

describe("progressão", () => {
  it("avisa quando passa de +10% sobre a semana anterior", () => {
    expect(avisosProgressao({ volumeKm: 34, anterioresKm: [30, 20, 30, 28] }).some((a) => a.includes("10%"))).toBe(true);
    expect(avisosProgressao({ volumeKm: 33, anterioresKm: [30, 20, 30, 28] }).length).toBe(0);
  });
  it("semana de recuperação deve ficar perto de 60%", () => {
    expect(avisosProgressao({ volumeKm: 25, anterioresKm: [30], tipoSemana: "regenerativa" }).length).toBe(1);
    expect(avisosProgressao({ volumeKm: 18, anterioresKm: [30], tipoSemana: "regenerativa" }).length).toBe(0);
  });
  it("semana 1: limite de 1,2× a média das 4 semanas (semanas vazias contam 0)", () => {
    // média = (0+0+0+35,6)/4 = 8,9 → limite 10,68 km
    expect(avisosProgressao({ volumeKm: 17, anterioresKm: [0, 0, 0, 35.6], primeiraSemana: true }).length).toBe(1);
    expect(avisosProgressao({ volumeKm: 10, anterioresKm: [0, 0, 0, 35.6], primeiraSemana: true }).length).toBe(0);
  });
});

describe("resumo do card Treino de hoje", () => {
  it("mostra paces pessoais (5 km em 25:00)", () => {
    const p = pacesDoVdot(calcularVdot(5, 1500));
    expect(resumoEstrutura(estruturaPadrao(), p)).toBe("6x 800 m @ 4:51/km · 9,5 km · ~53 min");
  });
  it("sem teste mostra versão genérica", () => {
    expect(resumoEstrutura(estruturaPadrao(), null)).toMatch(/^6x 800 m em ritmo Intervalado · ~/);
  });
});
