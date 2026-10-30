import { describe, expect, it } from "vitest";
import { PONTOS, validarCorrida, ligaDe } from "./ranking-pontos";
import { dataRecife, intervaloPeriodo } from "./recife-date";

describe("pontuação", () => {
  it("valores combinados", () => {
    expect(PONTOS.treinoConcluido).toBe(30);
    expect(PONTOS.resultadoBloco).toBe(10);
    expect(PONTOS.corridaPorKm).toBe(5);
    expect(PONTOS.corridaMaxKmDia).toBe(30);
    expect(PONTOS.checkin).toBe(10);
    expect(PONTOS.post).toBe(5);
    expect(PONTOS.bonusSequencia).toBe(50);
  });
  it("ligas", () => {
    expect(ligaDe(499).nome).toBe("Liga Bronze");
    expect(ligaDe(500).nome).toBe("Liga Prata");
    expect(ligaDe(1000).nome).toBe("Liga Ouro");
    expect(ligaDe(2000).nome).toBe("Liga Diamante");
  });
});

describe("antifraude corrida", () => {
  it("rejeita pace mais rápido que 2:30", () => expect(validarCorrida(10, 1490)).not.toBeNull());
  it("rejeita pace mais lento que 15:00", () => expect(validarCorrida(1, 901)).not.toBeNull());
  it("rejeita acima de 60 km", () => expect(validarCorrida(61, 61 * 360)).not.toBeNull());
  it("aceita 5 km em 27:30", () => expect(validarCorrida(5, 1650)).toBeNull());
});

describe("fuso Recife", () => {
  it("22h em Recife ainda é o mesmo dia", () => {
    expect(dataRecife(new Date("2026-10-30T01:30:00Z"))).toBe("2026-10-29");
  });
  it("semana vai de segunda a domingo", () => {
    expect(intervaloPeriodo("semana", new Date("2026-11-01T12:00:00Z"))).toEqual({ desde: "2026-10-26", ate: "2026-11-01" });
  });
  it("mês calendário", () => {
    expect(intervaloPeriodo("mes", new Date("2026-02-10T12:00:00Z"))).toEqual({ desde: "2026-02-01", ate: "2026-02-28" });
  });
});
