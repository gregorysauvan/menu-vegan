"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarmitonQueryBuilder = void 0;
class MarmitonQueryBuilder {
    constructor() {
        this.queryString = new URLSearchParams();
    }
    withTitleContaining(q) {
        this.queryString.append('aqt', encodeURIComponent(q));
        return this;
    }
    withPrice(p) {
        this.queryString.append('exp', String(p));
        return this;
    }
    withDifficulty(d) {
        this.queryString.append('dif', String(d));
        return this;
    }
    withType(t) {
        this.queryString.append('dt', t);
        return this;
    }
    takingLessThan(minutes) {
        this.queryString.append('ttlt', String(minutes));
        return this;
    }
    vegetarian() {
        this.queryString.append('prt', '1');
        return this;
    }
    vegan() {
        this.queryString.append('prt', '3');
        return this;
    }
    withoutGluten() {
        this.queryString.append('prt', '2');
        return this;
    }
    withoutDairyProducts() {
        this.queryString.append('prt', '4');
        return this;
    }
    /**
     * Without any cooking whatsoever
     */
    raw() {
        this.queryString.append('rct', '3');
        return this;
    }
    withoutOven() {
        this.queryString.delete('rct');
        this.queryString.append('rct', '2');
        this.queryString.append('rct', '3');
        return this;
    }
    /**
     * There must be photo of the final product.
     */
    withPhoto() {
        this.queryString.append('pht', '1');
        return this;
    }
    build() {
        // The title query in mandatory, but can be empty
        if (!this.queryString.has('aqt')) {
            this.queryString.set('aqt', '');
        }
        return this.queryString.toString();
    }
}
exports.MarmitonQueryBuilder = MarmitonQueryBuilder;
//# sourceMappingURL=marmiton-query-builder.js.map