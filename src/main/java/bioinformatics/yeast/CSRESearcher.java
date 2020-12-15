package bioinformatics.yeast;

import bioinformatics.LloydClustering;
import bioinformatics.Motifs;
import bioinformatics.Utils;

import java.util.*;
import java.util.stream.Collectors;

public class CSRESearcher {
    public static void main(String[] args) {
        YeastGenome genome = new YeastGenome();
        genome.filterGenes(1.5);
        Map<YeastGene, String> mappings = getGeneSequenceMapping(genome);

        String sequence = mappings.get(mappings.keySet().stream().filter(gene -> gene.getGene().equals("YKR057W")).findFirst().get());
        List<String> subsequences = new ArrayList<>();
        for (int i = 0; i < sequence.length(); i += 500) {
            if (i + 500 < sequence.length()) subsequences.add(sequence.substring(i, i + 500));
            else subsequences.add(sequence.substring(i));
        }
        List<String> motifs = Motifs.gibbsSampler(subsequences, 10, subsequences.size(), 1000);
        System.out.println(motifs);
        System.exit(0);

        int k = 10;

        Map<List<Double>, List<List<Double>>> clusters = LloydClustering.lloydKMeansClusteringAlgorithm(k, mappings.keySet().stream().map(YeastGene::getExpressionsLog).collect(Collectors.toList()));
        int clusterNum = 0;
        List<List<String>> allFoundMotifs = new ArrayList<>();
        for (List<Double> cluster : clusters.keySet()) {
            if (cluster.get(cluster.size() - 1) - cluster.get(0) > 0) {
                List<YeastGene> clusterGenes = clusters.get(cluster).stream().map(expressions -> lookupGeneByExpressions(mappings, expressions)).collect(Collectors.toList());
                List<String> sequences = clusterGenes.stream().map(mappings::get).collect(Collectors.toList());




                System.out.println("Cluster " + clusterNum + " sequences: " + sequences.size());
                List<String> foundMotifs = Motifs.gibbsSampler(sequences, 16, sequences.size(), 1000);
                allFoundMotifs.add(foundMotifs);
                List<Utils.Pair<String, List<Boolean>>> foundMotifsToKnown = foundMotifs.stream()
                        .map(motif -> new Utils.Pair<>(motif, Arrays.asList(motif.charAt(0) == 'C' , motif.charAt(7) == 'A' , motif.charAt(8) == 'T' , motif.charAt(11) == 'A' , motif.charAt(12) == 'T')))
                        .collect(Collectors.toList());
                System.out.println(foundMotifsToKnown);
            }
            clusterNum++;
        }
        Map<String, Integer> map = new HashMap<>();
        for (String motif: allFoundMotifs.get(0)) {
            map.put(motif, allFoundMotifs.subList(1, allFoundMotifs.size()).stream().map(list -> list.stream().map(otherMotif -> Motifs.calculateHammingDistance(motif, otherMotif)).min(Integer::compareTo).get()).reduce(0, Integer::sum));
        }
        int min = map.values().stream().min(Integer::compareTo).get();
        for (String motif : map.keySet()) {
            if (map.get(motif) == min) {
                System.out.println("motif: " + motif + " (" + min + ")");
                return;
            }
        }
    }

    public static Map<YeastGene, String> getGeneSequenceMapping(YeastGenome genome) {
        Map<YeastGene, String> mappings = new HashMap<>();
        for (String line : Utils.readResource("genes.txt").split("\n")) {
            String[] split = line.split(" \\| ");
            mappings.putIfAbsent(genome.getGenes().stream().filter(gene -> gene.getGene().equals(split[0])).findFirst().get(), split[1]);
        }
        return mappings;
    }

    public static YeastGene lookupGeneByExpressions(Map<YeastGene, String> mappings, List<Double> expressionsLog) {
        return mappings.keySet().stream().filter(gene -> gene.getExpressionsLog().equals(expressionsLog)).findFirst().get();
    }
}
