"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECIPE_TYPE = exports.RECIPE_DIFFICULTY = exports.RECIPE_PRICE = void 0;
/**
 * How much money would be spent by buying all the
 * stuff required to make the recipe.
 * There doesn't seems to be a direct money equivalent.
 */
var RECIPE_PRICE;
(function (RECIPE_PRICE) {
    /**
     * Let's roll out the pasta
     */
    RECIPE_PRICE[RECIPE_PRICE["CHEAP"] = 1] = "CHEAP";
    /**
     * Your average meal.
     */
    RECIPE_PRICE[RECIPE_PRICE["MEDIUM"] = 2] = "MEDIUM";
    /**
     * Lobsters and such ?
     */
    RECIPE_PRICE[RECIPE_PRICE["EXPENSIVE"] = 3] = "EXPENSIVE";
})(RECIPE_PRICE = exports.RECIPE_PRICE || (exports.RECIPE_PRICE = {}));
var RECIPE_DIFFICULTY;
(function (RECIPE_DIFFICULTY) {
    RECIPE_DIFFICULTY[RECIPE_DIFFICULTY["VERY_EASY"] = 1] = "VERY_EASY";
    RECIPE_DIFFICULTY[RECIPE_DIFFICULTY["EASY"] = 2] = "EASY";
    RECIPE_DIFFICULTY[RECIPE_DIFFICULTY["MEDIUM"] = 3] = "MEDIUM";
    RECIPE_DIFFICULTY[RECIPE_DIFFICULTY["HARD"] = 4] = "HARD";
})(RECIPE_DIFFICULTY = exports.RECIPE_DIFFICULTY || (exports.RECIPE_DIFFICULTY = {}));
var RECIPE_TYPE;
(function (RECIPE_TYPE) {
    RECIPE_TYPE["STARTER"] = "entree";
    RECIPE_TYPE["MAIN_COURSE"] = "platprincipal";
    RECIPE_TYPE["DESSERT"] = "dessert";
    RECIPE_TYPE["SIDE_DISH"] = "accompagnement";
    RECIPE_TYPE["SAUCE"] = "sauce";
    RECIPE_TYPE["BEVERAGE"] = "boisson";
    /**
     * Anything sugary
     */
    RECIPE_TYPE["CANDY"] = "confiserie";
    /**
     * How to be a better chef.
     * This one is weird.
     */
    RECIPE_TYPE["ADVICE"] = "conseil";
})(RECIPE_TYPE = exports.RECIPE_TYPE || (exports.RECIPE_TYPE = {}));
//# sourceMappingURL=recipe-enums.js.map