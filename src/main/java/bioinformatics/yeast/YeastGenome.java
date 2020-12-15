package bioinformatics.yeast;

import bioinformatics.LloydClustering;
import bioinformatics.Motifs;
import bioinformatics.Utils;
import org.knowm.xchart.SwingWrapper;
import org.knowm.xchart.XYChart;
import org.knowm.xchart.XYChartBuilder;
import org.knowm.xchart.XYSeries;
import org.knowm.xchart.style.Styler;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static bioinformatics.yeast.GeneSequenceParser.*;

public class YeastGenome {
    private List<YeastGene> genes;

    public YeastGenome() {
        Pattern linePattern = Pattern.compile("^\\d+\\t([^\\s]+)\\s((.+)\\t)*\\t*(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)");
        String yeastGeneExpressionFile = Utils.readResource("yeast-gene-expressions.txt");
        assert yeastGeneExpressionFile != null;
        List<String> lines = Arrays.asList(yeastGeneExpressionFile.split("\n"));
        this.genes = lines.subList(1, lines.size()).stream().map(line -> {
            Matcher matcher = linePattern.matcher(line);
            matcher.find();
            String gene = matcher.group(1);
            String standardName = matcher.group(3);
            List<Double> expressions = new ArrayList<>();
            for (int i = 4; i <= 10; i++) expressions.add(Double.parseDouble(matcher.group(i)));
            return new YeastGene(gene, standardName, expressions);
        }).collect(Collectors.toList());
    }

    public static double calculateSSE(Map<List<Double>, List<List<Double>>> clusters) {
        double sse = 0;
        for (Map.Entry<List<Double>, List<List<Double>>> cluster : clusters.entrySet()) {
            List<Double> clusterCenter = cluster.getKey();
            List<List<Double>> clusterPoints = cluster.getValue();
            for (List<Double> point : clusterPoints) {
                sse += Math.pow(LloydClustering.euclideanDistance(clusterCenter, point), 2.0);
            }
        }
        return sse;
    }

    public static void main(String[] args) {
        YeastGenome yeastGenome = new YeastGenome();
        //yeastGenome.filterGenes(2.2);
        List<List<Double>> data = yeastGenome.getGenes().stream().map(YeastGene::getExpressionsLog).collect(Collectors.toList());

        XYChart kChart = new XYChartBuilder().width(600).height(400).title("k SSEs").xAxisTitle("k").yAxisTitle("SSE").build();
        kChart.getStyler().setDefaultSeriesRenderStyle(XYSeries.XYSeriesRenderStyle.Line);
        kChart.getStyler().setChartTitleVisible(false);
        kChart.getStyler().setLegendPosition(Styler.LegendPosition.InsideNE);

        List<Double> sses = new ArrayList<>();
        List<Integer> ks = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            Map<List<Double>, List<List<Double>>> clustersToTest = LloydClustering.lloydKMeansClusteringAlgorithm(i, data);
            sses.add(calculateSSE(clustersToTest));
            ks.add(i);
        }

        kChart.addSeries("SSEs", ks, sses);
        new SwingWrapper(kChart).displayChart();


        int bestClusterNum = 6;
        Map<List<Double>, List<List<Double>>> bestClusters = LloydClustering.lloydKMeansClusteringAlgorithm(bestClusterNum, data);
        System.out.println("Best estimate for proper k (using elbow method) is " + bestClusterNum + " with SSE of " + calculateSSE(bestClusters));


        Map<List<Double>, List<List<Double>>> clusters = bestClusters;

        XYChart pointsChart = new XYChartBuilder().width(600).height(400).title("Gene Expressions").xAxisTitle("Time after dia.").yAxisTitle("Expression").build();

        pointsChart.getStyler().setDefaultSeriesRenderStyle(XYSeries.XYSeriesRenderStyle.Line);
        pointsChart.getStyler().setChartTitleVisible(false);
        pointsChart.getStyler().setLegendPosition(Styler.LegendPosition.InsideSW);

        int index = 0;
        for (List<Double> point : data) {
            pointsChart.addSeries("Point " + index, Arrays.asList(-6, -4, -2, 0, 2, 4, 6), point);
            index++;
        }

        new SwingWrapper(pointsChart).displayChart();


        XYChart clustersChart = new XYChartBuilder().width(600).height(400).title("Gene Expressions (Clusters)").xAxisTitle("Time after dia.").yAxisTitle("Expression").build();
        clustersChart.getStyler().setDefaultSeriesRenderStyle(XYSeries.XYSeriesRenderStyle.Line);
        clustersChart.getStyler().setChartTitleVisible(false);
        clustersChart.getStyler().setLegendPosition(Styler.LegendPosition.InsideSW);

        index = 0;
        for (Map.Entry<List<Double>, List<List<Double>>> cluster : clusters.entrySet()) {
            List<Double> clusterCenter = cluster.getKey();
            List<List<Double>> clusteredPoints = cluster.getValue();
            clustersChart.addSeries("Cluster " + index + " (check console for mapping)", Arrays.asList(-6, -4, -2, 0, 2, 4, 6), clusterCenter);
            System.out.println("====\nCluster " + index + " maps to the following points:");
            for (int i = 0; i < clusteredPoints.size(); i++) {
                List<Double> point = clusteredPoints.get(i);
                System.out.println("" + i + ": " + point.stream().map(Object::toString).collect(Collectors.joining(" ")));
            }
            index++;
        }

        new SwingWrapper(clustersChart).displayChart();

        System.out.println("=======");
        index = 0;
        int numIncreasing = 0;
        for (Map.Entry<List<Double>, List<List<Double>>> cluster : clusters.entrySet()) {
            List<Double> clusterCenter = cluster.getKey();
            if (clusterCenter.get(clusterCenter.size() - 1) > 0) { // trends upwards
                System.out.println(cluster.getValue().size() + " genes in cluster " + index + " " + clusterCenter + " show increasing expression levels after diauxic shift. These genes are below: ");
                for (List<Double> clusteredPoint : cluster.getValue()) {
                    numIncreasing++;
                    YeastGene gene = yeastGenome.getGenes().stream().filter(g -> g.getExpressionsLog().equals(clusteredPoint)).findFirst().get();
                    double start = clusteredPoint.get(0);
                    double end = clusteredPoint.get(clusteredPoint.size() - 1);

                    System.out.println(gene.getGene() + ": " + start + " -> " + end);
                }
            }
            index++;
        }
        System.out.println("\n\nNumber of genes increasing: " + numIncreasing);


        List<Utils.Pair<String, String>> csreGenesList = Arrays.stream(Utils.readResource("CSREfound.txt").split("\n\n"))
                .map(csre -> {
                    String[] split = csre.split("\n");
                    String name = split[0].replace("CSRE is found in gene ", "");
                    String sequence = split[1].replace("Sequence:", "");
                    return new Utils.Pair<>(name, sequence);
                }).collect(Collectors.toList());
        Map<String, String> csreGeneToSequenceMap = new HashMap<>();
        for (Utils.Pair<String, String> pair : csreGenesList) {
            csreGeneToSequenceMap.put(pair.getK(), pair.getV());
        }

        System.out.println("=======");
        int csre = 0;
        int clusterNumber = 0;
        for (Map.Entry<List<Double>, List<List<Double>>> cluster : clusters.entrySet()) {
            List<Double> clusterCenter = cluster.getKey();
            List<String> clusterSequences = new ArrayList<>();
            if (clusterCenter.get(clusterCenter.size() - 1) > 0) { // trends upwards
                for (List<Double> clusteredPoint : cluster.getValue()) {
                    YeastGene gene = yeastGenome.getGenes().stream().filter(g -> g.getExpressionsLog().equals(clusteredPoint)).findFirst().get();

                    if (csreGeneToSequenceMap.containsKey(gene.getGene())) {
                        clusterSequences.add(csreGeneToSequenceMap.get(gene.getGene()));
                        csre++;
                        List<String> kmers = Motifs.generateKmers(csreGeneToSequenceMap.get(gene.getGene()), csrePattern.length());
                        String type = null;
                        String foundKmer = null;
                        int hamming = 0;
                        for (String kmer : kmers) {
                            if (Motifs.calculateHammingDistance(kmer, csrePattern) <= 1) {
                                type = "normal";
                                foundKmer = kmer;
                                hamming = Motifs.calculateHammingDistance(kmer, csrePattern);
                                break;
                            } else if (Motifs.calculateHammingDistance(kmer, reversed(csrePattern)) <= 1) {
                                type = "reversed";
                                foundKmer = kmer;
                                hamming = Motifs.calculateHammingDistance(kmer, reversed(csrePattern));
                                break;
                            } else if (Motifs.calculateHammingDistance(kmer, oppositeDnaSequence(csrePattern)) <= 1) {
                                type = "complement";
                                foundKmer = kmer;
                                hamming = Motifs.calculateHammingDistance(kmer, oppositeDnaSequence(csrePattern));
                                break;
                            }
                        }

                        System.out.println("Gene " + gene.getGene() + ":\nExpressions: " + gene.getExpressionsLog() + "\nCluster:" + clusterNumber
                                + "\nCSRE kmer: " + foundKmer + " (hamming distance of " + hamming + ")\nCSRE type: " + type);
                        System.out.println();
                    }
                }

            }

            clusterNumber++;
        }

        System.out.println("\n\nThere are a total of " + csre + " genes that show increasing expression levels after diauxic shift " +
                "and contain the CSRE motif.");

        List<String> sequences = new ArrayList<>(csreGeneToSequenceMap.values());
        System.out.println(Motifs.gibbsSampler(sequences, 10, sequences.size(), 1000));

    }

    // filter out genes who don't change more than deltaChange
    public void filterGenes(double deltaChange) {
        genes = genes.stream().filter(gene -> gene.doesSignificantlyChange(deltaChange)).collect(Collectors.toList());
    }

    public List<YeastGene> getGenes() {
        return genes;
    }
}
