import { describe, expect, it } from "vitest";

import { Interpolator } from "./";

describe("Interpolator", () => {
  it("should initalize with options", () => {
    const options = {};
    const interpolator = new Interpolator();
    expect(interpolator).toBeInstanceOf(Interpolator);
    expect(interpolator.options).toStrictEqual(options);
  });
});

describe("Parser", () => {
  it("should parse interpolated text", () => {
    const interpolator = new Interpolator();
    const str = "Hi my name is {name}";
    const data = {
      name: "dan"
    };
    const interpolated = interpolator.parse(str, data);
    const expected = "Hi my name is dan";
    expect(interpolated).toBe(expected);
  });

  it("should parsed interpolated text with alt text", () => {
    const interpolator = new Interpolator();
    const str = `Hi my name is {name:Altnerative}`;
    const interpolated = interpolator.parse(str);
    const expected = "Hi my name is Altnerative";
    expect(interpolated).toMatch(expected);
  });

  it("should fail gracefully", () => {
    const interpolator = new Interpolator();
    const str = "Hi my name is {name}";
    const interpolated = interpolator.parse(str);
    const expected = "Hi my name is ";
    expect(interpolated).toMatch(expected);
  });

  it("should register and execute custom modifiers successfully", () => {
    const interpolator = new Interpolator({
      modifiers: [
        {
          key: "myCustomModifier",
          transform: (str) => str.split("").reverse().join("")
        }
      ]
    });
    const replaceThis = `Hi, my name is {name:frontwards|myCustomModifier}.`;

    const interpolated = interpolator.parse(replaceThis);
    const expected = "Hi, my name is sdrawtnorf.";
    expect(interpolated).toBe(expected);
  });

  it("should gracefullt fail undefined modifiers", () => {
    const interpolator = new Interpolator();
    const replaceThis = `Hi, my name is {name|undefinedModifier}.`;
    const data = {
      name: "Dan"
    };
    const interpolated = interpolator.parse(replaceThis, data);
    const expected = "Hi, my name is Dan.";
    expect(interpolated).toBe(expected);
  });

  it("should return itself if nothing is provided", () => {
    const interpolator = new Interpolator();
    const str = "Hello world";
    const interpolated = interpolator.parse(str);
    expect(interpolated).toBe(str);
  });

  it("should parse undefined data that has no alternative text", () => {
    const interpolator = new Interpolator();
    const str = `Hi my name is {name|uppercase}`;
    const data = {
      notName: "dan"
    };
    const interpolated = interpolator.parse(str, data);
    const expected = "Hi my name is ";
    expect(interpolated).toMatch(expected);
  });

  it("should support data aliases references from helper function", () => {
    const interpolator = new Interpolator({
      aliases: [
        {
          key: "city",
          ref: "test city data"
        }
      ]
    });

    expect(interpolator.aliases[0].ref).toBe("test city data");
  });

  it("should add data aliases", () => {
    const interpolator = new Interpolator({
      aliases: [
        {
          key: "firstName",
          ref: "name.first"
        },
        {
          key: "lastName",
          ref: "name.last"
        },
        {
          key: "city",
          ref: "locations[0]"
        },
        {
          key: "state",
          ref: "locations[1]"
        }
      ]
    });
    const originalReplace = `{name.first} {name.last} is from {locations[0]} {locations[1]}`;
    const replaceThis = `{firstName} {lastName} is from {city} {state}`;
    const data = {
      name: {
        first: "Dan",
        last: "Seripap"
      },
      locations: ["New York", "NY"]
    };

    const originalInterpolated = interpolator.parse(originalReplace, data);
    const interpolated = interpolator.parse(replaceThis, data);
    const expected = "Dan Seripap is from New York NY";
    expect(originalInterpolated).toMatch(expected);
    expect(interpolated).toMatch(expected);
  });

  it("should remove data aliases", () => {
    const interpolator = new Interpolator();
    const replaceThis = `{city} is great!`;
    const data = {
      location: {
        city: "New York"
      }
    };
    interpolator.registerAlias({
      key: "city",
      ref: "location.city"
    });
    const interpolated = interpolator.parse(replaceThis, data);
    const expected = "New York is great!";
    expect(interpolated).toBe(expected);

    interpolator.removeAlias("city");
    const interpolatedAgain = interpolator.parse(replaceThis, data);
    expect(interpolatedAgain).toBe(" is great!");
  });

  it("modifiers should have access to raw data", () => {
    const interpolator = new Interpolator();
    const replaceThis = `2015 World Series Winner: {2015|year2015}`;
    const worldSeriesWinner = {
      winners: [
        {
          year: 2015,
          team: "Royals"
        },
        {
          year: 2016,
          team: "Cubs"
        },
        {
          year: 2017,
          team: "Astros"
        }
      ]
    };

    // val will be`2015`, data will be worldSeriesWinner
    const advanceCustomModifier = (val, data) => {
      try {
        // val is always a string, which is why parseInt is neccessary if referencing a number
        const winner = data.winners.find(
          (winner) => winner.year === parseInt(val)
        );
        return winner.team;
      } catch (e) {
        console.log(e);
        return val;
      }
    };

    interpolator.registerModifier({
      key: "year2015",
      transform: advanceCustomModifier
    });

    const interpolated = interpolator.parse(replaceThis, worldSeriesWinner);
    expect(interpolated).toBe("2015 World Series Winner: Royals");
  });
});
