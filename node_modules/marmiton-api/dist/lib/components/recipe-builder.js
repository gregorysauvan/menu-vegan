"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeBuilder = void 0;
class RecipeBuilder {
    constructor() {
        this.infos = {};
    }
    withName(name) {
        this.infos['name'] = name;
        return this;
    }
    withDescription(desc) {
        this.infos['description'] = desc;
        return this;
    }
    withUrl(url) {
        this.infos['url'] = url;
        return this;
    }
    withRate(rate) {
        this.infos['rate'] = rate;
        return this;
    }
    withTags(tags) {
        this.infos['tags'] = tags;
        return this;
    }
    withDifficulty(d) {
        this.infos['difficulty'] = d;
        return this;
    }
    withBudget(b) {
        this.infos['budget'] = b;
        return this;
    }
    withAuthor(s) {
        this.infos['author'] = s;
        return this;
    }
    withPeople(nb) {
        this.infos['people'] = isNaN(nb) ? undefined : nb;
        return this;
    }
    withIngredients(ing) {
        this.infos['ingredients'] = ing;
        return this;
    }
    withPreparationTime(prep) {
        this.infos['prepTime'] = prep;
        return this;
    }
    withTotalTime(total) {
        this.infos['totalTime'] = total;
        return this;
    }
    withSteps(steps) {
        this.infos['steps'] = steps;
        return this;
    }
    withImages(images) {
        this.infos['images'] = images;
        return this;
    }
    build() {
        return this.infos;
    }
}
exports.RecipeBuilder = RecipeBuilder;
//# sourceMappingURL=recipe-builder.js.map