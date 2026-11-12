<script setup>
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
</script>

<template>
  <TabsRoot default-value="a">
    <TabsList>
      <TabsTrigger value="a" as-child>
        <button class="tab-a">A</button>
      </TabsTrigger>
      <TabsTrigger value="b" as-child>
        <button class="tab-b">B</button>
      </TabsTrigger>
    </TabsList>
    <TabsContent value="a"><p class="panel-a">Panel A</p></TabsContent>
    <TabsContent value="b"><p class="panel-b">Panel B</p></TabsContent>
  </TabsRoot>
</template>
