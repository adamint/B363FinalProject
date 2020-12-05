package bioinformatics;

import java.util.*;
import java.util.stream.Collectors;

public class MotifMatrix {
    private static final List<Character> nucleotides = Arrays.asList('A', 'G', 'C', 'T');
    private List<String> motifs;
    private Map<Character, List<Double>> profile;
    private List<List<Double>> profileColumns;
    private Map<Character, List<Integer>> count;
    private boolean useLaplace = false;

    public MotifMatrix(List<String> motifs, boolean useLaplace) {
        instantiate(motifs, useLaplace);
    }

    public MotifMatrix(List<String> motifs) {
        instantiate(motifs, false);
    }

    public MotifMatrix(List<Double> a, List<Double> t, List<Double> g, List<Double> c) {
        this.motifs = null;
        this.profile = new HashMap<>();
        profile.put('A', a);
        profile.put('T', t);
        profile.put('G', g);
        profile.put('C', c);
        this.profileColumns = getProfileColumns();
    }

    private void instantiate(List<String> motifs, boolean useLaplace) {
        this.useLaplace = useLaplace;
        this.motifs = motifs
                .stream()
                .map(String::toUpperCase)
                .collect(Collectors.toList());
        profile = getProfile();
        profileColumns = getProfileColumns();
        count = getCount(useLaplace);
    }

    public List<String> getMotifs() {
        return motifs;
    }

    public List<String> getRows() {
        return getMotifs();
    }

    public List<String> getColumns() {
        List<String> columns = new ArrayList<>();
        for (int i = 0; i < motifs.get(0).length(); i++) {
            StringBuilder column = new StringBuilder();
            for (String motif : motifs) column.append(motif.charAt(i));

            columns.add(column.toString());
        }

        return columns;
    }

    public List<Utils.Pair<Character, Integer>> getMostFrequentColumnNucleotides() {
        return getColumns()
                .stream().map(column -> {
                    Map<Character, Integer> frequencyMap = new HashMap<>();
                    for (char c : column.toCharArray()) {
                        frequencyMap.putIfAbsent(c, 0);
                        frequencyMap.replace(c, frequencyMap.get(c) + 1);
                    }
                    List<Character> keys = new ArrayList<>(frequencyMap.keySet());
                    keys.sort(Comparator.comparingInt(frequencyMap::get));

                    int total = frequencyMap.values().stream().reduce(0, Integer::sum);

                    return Utils.Pair.of(keys.get(keys.size() - 1), total - frequencyMap.get(keys.get(keys.size() - 1)));
                }).collect(Collectors.toList());
    }

    public int getScore() {
        return getMostFrequentColumnNucleotides()
                .stream()
                .map(Utils.Pair::getV)
                .reduce(0, Integer::sum);
    }

    private Map<Character, List<Integer>> getCount(boolean useLaplace) {
        Map<Character, List<Integer>> characterCounts = new HashMap<>();
        for (String column : getColumns()) {
            Map<Character, Integer> frequencyMap = new HashMap<>();
            for (char c : column.toCharArray()) {
                frequencyMap.putIfAbsent(c, 0);
                frequencyMap.replace(c, frequencyMap.get(c) + 1);
            }
            for (char c : nucleotides) frequencyMap.putIfAbsent(c, 0);

            frequencyMap.forEach((key, value) -> {
                characterCounts.putIfAbsent(key, new ArrayList<>());
                if (!useLaplace) characterCounts.get(key).add(value);
                else characterCounts.get(key).add(value + 1);
            });

        }

        return characterCounts;
    }

    public Map<Character, List<Integer>> getCount() {
        return count;
    }

    public Map<Character, List<Double>> getProfile() {
        Map<Character, List<Double>> profile = new HashMap<>();
        for (String column : getColumns()) {
            Map<Character, Integer> frequencyMap = new HashMap<>();
            for (char c : column.toCharArray()) {
                frequencyMap.putIfAbsent(c, 0);
                frequencyMap.replace(c, frequencyMap.get(c) + 1);
            }
            for (char c : nucleotides) frequencyMap.putIfAbsent(c, 0);
            if (useLaplace) {
                for (char c : nucleotides) frequencyMap.replace(c, frequencyMap.get(c) + 1);
            }
            double sum = frequencyMap.values().stream().reduce(0, Integer::sum);

            frequencyMap.forEach((key, value) -> {
                profile.putIfAbsent(key, new ArrayList<>());
                profile.get(key).add((double) value / sum);
            });
        }
        return profile;
    }

    public String getConsensus() {
        StringBuilder consensus = new StringBuilder();
        List<Character> keys = nucleotides;

        for (int i = 0; i < getColumns().size(); i++) {
            int maxIndex = 0;
            for (int keyIndex = 1; keyIndex < keys.size(); keyIndex++) {
                if (profile.get(keys.get(keyIndex)).get(i) > profile.get(keys.get(maxIndex)).get(i)) {
                    maxIndex = keyIndex;
                }
            }
            consensus.append(keys.get(maxIndex));
        }

        return consensus.toString();
    }

    public int getProfileColumnsLength() {
        return profile.get(nucleotides.get(0)).size();
    }

    public List<List<Double>> getProfileColumns() {
        List<List<Double>> profileColumns = new ArrayList<>();
        for (int columnIndex = 0; columnIndex < getProfileColumnsLength(); columnIndex++) {
            List<Double> column = new ArrayList<>();
            for (char key : nucleotides) column.add(profile.get(key).get(columnIndex));
            profileColumns.add(column);
        }

        return profileColumns;
    }

    public double getEntropy() {
        double totalSum = 0;
        for (List<Double> profileColumn : profileColumns) {
            totalSum += -profileColumn
                    .stream()
                    .map(prob -> prob * Utils.logBase2(prob))
                    .reduce(0.0, Double::sum);
        }
        return totalSum;
    }

    public double getProbabilityOfBeing(String pattern) {
        double maxProbability = 0.0;
        for (int start = 0; start < getProfileColumns().size() - pattern.length() + 1; start++) {
            double probability = 1;
            for (int i = start; i < start + pattern.length(); i++) {
                char c = pattern.charAt(i);
                probability *= profile.get(c).get(i);
            }
            if (probability > maxProbability) maxProbability = probability;
        }
        return maxProbability;
    }

    public String getProfileMostProbableKmer(String text, int k) {
        List<String> kmers = Motifs.generateKmers(text, k);
        int maxProbabilityIndex = 0;
        for (int i = 1; i < kmers.size(); i++) {
            if (getProbabilityOfBeing(kmers.get(i)) > getProbabilityOfBeing(kmers.get(maxProbabilityIndex))) {
                maxProbabilityIndex = i;
            }
        }

        return kmers.get(maxProbabilityIndex);
    }

    public List<String> getProfileMostProbableKmers(List<String> texts, int k) {
        return texts
                .stream()
                .map(row -> getProfileMostProbableKmer(row, k))
                .collect(Collectors.toList());
    }

    public String getProfileRandomlyGeneratedKmer(String text, int k) {
        List<Double> probabilities = new ArrayList<>();
        List<String> kmers = Motifs.generateKmers(text, k);
        for (String kmer : kmers) probabilities.add(getProbabilityOfBeing(kmer));
        return kmers.get(getRandomInDistribution(probabilities));
    }

    public int getRandomInDistribution(List<Double> probabilities) {
        double totalProbability = probabilities.stream().reduce(0.0, Double::sum);
        double value = new Random().nextDouble() * totalProbability;
        double currentTotal = 0;
        int i = 0;
        while (currentTotal < value) {
            currentTotal += probabilities.get(i);
            i += 1;
        }
        return i - 1;
    }

}
