package bioinformatics.yeast;

import java.util.List;
import java.util.stream.Collectors;

public class YeastGene {
    private String gene;
    private String standardName;
    private List<Double> expressions;
    private List<Double> expressionsLog;

    public YeastGene(String gene, String standardName, List<Double> expressions) {
        this.gene = gene;
        this.standardName = standardName;
        this.expressions = expressions;
        this.expressionsLog = expressions.stream().map(expression -> Math.log(expression) / Math.log(2)).collect(Collectors.toList());
    }

    public List<Double> getExpressionsLog() {
        return expressionsLog;
    }

    public double getExpressionAtDiauxicShift() {
        return expressionsLog.get(expressionsLog.size() / 2);
    }

    public double getInitialLogExpression() {
        return expressionsLog.get(0);
    }

    public double getEndLogExpression() {
        return expressionsLog.get(expressionsLog.size() - 1);
    }

    public boolean doesSignificantlyChange(double delta) {
        return !expressionsLog.stream().allMatch(expression -> Math.abs(expression) < delta);
    }

    public String getGene() {
        return gene;
    }
}
