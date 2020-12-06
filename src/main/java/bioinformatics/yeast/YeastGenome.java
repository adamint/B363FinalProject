package bioinformatics.yeast;

import bioinformatics.Utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class YeastGenome {
    private List<YeastGene> genes;

    public YeastGenome() {
        Pattern linePattern = Pattern.compile("^\\d+\\t([^\\s]+)\\s((.+)\\t)*\\t*(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)");
        String yeastGeneExpressionFile = Utils.readResource("yeast-gene-expressions.txt");
        assert yeastGeneExpressionFile != null;
        List<String> lines = Arrays.asList(yeastGeneExpressionFile.split("\n"));
        this.genes = lines.subList(1, lines.size()).stream().map(line -> {
            System.out.println(line);
            Matcher matcher = linePattern.matcher(line);
            matcher.find();
            String gene = matcher.group(1);
            String standardName = matcher.group(3);
            List<Double> expressions = new ArrayList<>();
            for (int i = 4; i <= 10; i++) expressions.add(Double.parseDouble(matcher.group(i)));
            return new YeastGene(gene, standardName, expressions);
        }).collect(Collectors.toList());
    }

    // filter out genes who don't change more than deltaChange
    public void filterGenes(double deltaChange) {
        genes = genes.stream().filter(gene -> gene.doesSignificantlyChange(deltaChange)).collect(Collectors.toList());
    }

    public static void main(String[] args) {
        new YeastGenome();
    }
}
