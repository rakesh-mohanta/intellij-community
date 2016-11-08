/*
 * Copyright 2000-2016 JetBrains s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.jetbrains.plugins.groovy.transformations.singleton

import com.intellij.codeInsight.AnnotationUtil
import com.intellij.codeInspection.LocalQuickFix
import com.intellij.codeInspection.ProblemDescriptor
import com.intellij.openapi.project.Project
import org.jetbrains.annotations.Nls
import org.jetbrains.plugins.groovy.lang.psi.GroovyPsiElementFactory
import org.jetbrains.plugins.groovy.transformations.message

internal class MakeNonStrictQuickFix : LocalQuickFix {

  @Nls
  override fun getFamilyName() = message("singleton.constructor.makeNonStrict")

  override fun applyFix(project: Project, descriptor: ProblemDescriptor) {
    val annotation = getAnnotation(descriptor.psiElement) ?: return
    val existingValue = AnnotationUtil.findDeclaredAttribute(annotation, "strict")
    val newValue = GroovyPsiElementFactory.getInstance(project)
      .createAnnotationFromText("@A(strict=false)")
      .parameterList
      .attributes[0]
    if (existingValue == null) {
      annotation.parameterList.add(newValue)
    }
    else {
      existingValue.replace(newValue)
    }
  }
}
