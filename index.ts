import get from "lodash/get";

export type Alias = {
  key: string;
  ref: string;
};

export type Modifier = {
  key: string;
  transform: (value: string, rawData: Record<string, unknown>) => string;
};

export type Options = {
  aliases?: Alias[];
  modifiers?: Modifier[];
};

type Rule = {
  key: string;
  replace: string;
  modifiers: Modifier[];
  alternativeText: string;
};

export class Interpolator {
  options: Options;
  modifiers: Modifier[];
  aliases: Alias[];

  constructor(options: Options = {}) {
    this.options = options;
    this.modifiers = [];
    this.aliases = [];
    options.modifiers?.forEach((x) => this.registerModifier(x));
    options.aliases?.forEach((x) => this.registerAlias(x));
  }

  registerModifier(modifier: Modifier) {
    this.modifiers.push(modifier);
    return this;
  }

  parseRules(str: string): Rule[] {
    return (
      str.match(new RegExp(`{([^}]+)}`, "gi"))?.map((match) => {
        return {
          key: this.getKeyFromMatch(match),
          replace: match,
          modifiers: this.getModifiers(match).reduce<Modifier[]>((acc, x) => {
            if (x) acc.push(x);
            return acc;
          }, []),
          alternativeText: this.getAlternativeText(match)
        };
      }) || []
    );
  }

  getKeyFromMatch(match: string) {
    const removeReservedSymbols = [":", "|"];
    return this.removeDelimiter(
      removeReservedSymbols.reduce(
        (val, sym) => (val.indexOf(sym) > 0 ? this.removeAfter(val, sym) : val),
        match
      )
    );
  }

  removeDelimiter(val: string) {
    return val
      .replace(new RegExp("{", "g"), "")
      .replace(new RegExp("}", "g"), "");
  }

  removeAfter(str: string, val: string) {
    return str.substring(0, str.indexOf(val));
  }

  extractAfter(str: string, val: string) {
    return str.substring(str.indexOf(val) + 1);
  }

  getAlternativeText(str: string) {
    if (str.indexOf(":") > 0) {
      const altText = this.removeDelimiter(this.extractAfter(str, ":"));
      if (altText.indexOf("|") > 0) {
        return this.removeAfter(altText, "|");
      }
      return altText;
    }

    return "";
  }

  getModifiers(str: string) {
    if (str.indexOf("|") > 0) {
      return this.removeDelimiter(this.extractAfter(str, "|"))
        .split(",")
        .map((modifier) => this.getModifier(modifier));
    }

    return [];
  }

  parse(str = "", data = {}) {
    const rules = this.parseRules(str);
    if (rules && rules.length > 0) {
      return this.parseFromRules(str, data, rules);
    }

    return str;
  }

  parseFromRules(str: string, data, rules: Rule[]) {
    return rules.reduce(
      (reducedStr, rule) => this.applyRule(reducedStr, rule, data),
      str
    );
  }

  applyRule(str: string, rule: Rule, data: Record<string, unknown> = {}) {
    const dataToReplace = this.applyData(rule.key, data);
    if (dataToReplace) {
      return str.replace(
        rule.replace,
        this.applyModifiers(rule.modifiers, String(dataToReplace), data)
      );
    } else if (rule.alternativeText) {
      return str.replace(
        rule.replace,
        this.applyModifiers(rule.modifiers, rule.alternativeText, data)
      );
    }

    const defaultModifier = this.applyModifiers(rule.modifiers, rule.key, data);
    if (defaultModifier === rule.key) {
      return str.replace(rule.replace, "");
    }
    return str.replace(rule.replace, defaultModifier);
  }

  getFromAlias(key: string) {
    return this.aliases.find((alias) => alias.key === key);
  }

  applyData(key: string, data: Record<string, unknown>) {
    const alias = this.getFromAlias(key);
    if (alias) {
      const value = get(data, alias.ref);
      if (value) {
        return value;
      }
    }
    return get(data, key);
  }

  getModifier(key: string) {
    return this.modifiers.find((modifier) => modifier.key === key);
  }

  applyModifiers(
    modifiers: Modifier[],
    str: string,
    rawData: Record<string, unknown>
  ) {
    return modifiers.reduce((acc, x) => x.transform(acc, rawData), str);
  }

  registerAlias(newAlias: Alias) {
    this.aliases.push(newAlias);
    return this;
  }

  removeAlias(key: string) {
    this.aliases = this.aliases.filter((alias) => alias.key !== key);
    return this;
  }
}
